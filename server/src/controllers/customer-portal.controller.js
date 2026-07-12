import { prisma } from '../utils/db.js';
import { sendSuccess } from '../utils/response.util.js';
import { AppError, NotFoundError } from '../utils/errors.util.js';

export const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        customer: { userId },
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
        date: { gte: new Date(new Date().setHours(0,0,0,0)) }
      },
      include: {
        tenant: { select: { name: true } },
        branch: { select: { name: true, address: true } },
        services: {
          include: {
            service: { select: { name: true, baseDuration: true } },
            worker: { select: { user: { include: { profile: true } } } }
          }
        }
      },
      orderBy: { date: 'asc' },
      take: 5
    });

    const customers = await prisma.customer.findMany({
      where: { userId }
    });

    const totalWalletBalance = customers.reduce((acc, c) => acc + c.walletBalance, 0);
    const totalLoyaltyPoints = customers.reduce((acc, c) => acc + c.loyaltyPoints, 0);

    sendSuccess(res, {
      upcomingAppointments,
      walletBalance: totalWalletBalance,
      loyaltyPoints: totalLoyaltyPoints
    });
  } catch (error) {
    next(error);
  }
};

export const getAppointments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status } = req.query; // 'upcoming' or 'past'

    const dateFilter = status === 'past' 
      ? { lt: new Date(new Date().setHours(0,0,0,0)) }
      : { gte: new Date(new Date().setHours(0,0,0,0)) };

    const statusFilter = status === 'past' 
      ? { in: ['COMPLETED', 'CANCELLED', 'NO_SHOW'] }
      : { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] };

    const appointments = await prisma.appointment.findMany({
      where: {
        customer: { userId },
        date: dateFilter,
        status: statusFilter
      },
      include: {
        tenant: { select: { name: true } },
        branch: { select: { name: true, address: true } },
        services: {
          include: {
            service: { select: { name: true, baseDuration: true } },
            worker: { select: { user: { include: { profile: true } } } }
          }
        }
      },
      orderBy: { date: status === 'past' ? 'desc' : 'asc' }
    });

    sendSuccess(res, { appointments });
  } catch (error) {
    next(error);
  }
};

export const createBooking = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let { tenantId, branchId, date, services, notes } = req.body;

    if (!branchId && tenantId) {
      const firstBranch = await prisma.branch.findFirst({ where: { tenantId } });
      if (firstBranch) {
        branchId = firstBranch.id;
      } else {
        const newBranch = await prisma.branch.create({
          data: { tenantId, name: 'Main Branch' }
        });
        branchId = newBranch.id;
      }
    }

    if (!tenantId || !branchId || !date || !services || services.length === 0) {
      throw new AppError('Missing required booking details', 400);
    }

    // Lazy load or create Customer record for this tenant
    let customer = await prisma.customer.findFirst({
      where: { userId, tenantId }
    });

    if (!customer) {
      const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
      customer = await prisma.customer.create({
        data: {
          userId,
          tenantId,
          firstName: user.profile?.firstName || 'Unknown',
          lastName: user.profile?.lastName || 'Unknown',
          email: user.email,
          phone: user.phone
        }
      });
    }

    // Calculate totals and format services
    let totalPrice = 0;
    let totalDuration = 0;
    
    let currentStartTime = new Date(date);
    
    // Prevent booking in the past
    if (currentStartTime < new Date()) {
      throw new AppError('Cannot book an appointment in the past', 400);
    }

    const appointmentServicesData = await Promise.all(services.map(async (svc) => {
      const serviceData = await prisma.service.findUnique({ where: { id: svc.serviceId } });
      if (!serviceData) throw new NotFoundError(`Service ${svc.serviceId} not found`);

      const price = serviceData.basePrice;
      const duration = serviceData.baseDuration;
      
      const startTime = new Date(currentStartTime);
      const endTime = new Date(currentStartTime.getTime() + duration * 60000);
      
      currentStartTime = endTime; // advance for next service

      totalPrice += price;
      totalDuration += duration;

      return {
        serviceId: svc.serviceId,
        workerProfileId: svc.workerProfileId, // Provided from UI
        price,
        startTime,
        endTime,
        status: 'PENDING'
      };
    }));

    const appointment = await prisma.appointment.create({
      data: {
        tenantId,
        branchId,
        customerId: customer.id,
        date: new Date(date),
        totalPrice,
        totalDuration,
        notes,
        services: {
          create: appointmentServicesData
        }
      },
      include: {
        services: true
      }
    });

    sendSuccess(res, { appointment }, 201);
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const appointment = await prisma.appointment.findFirst({
      where: { id, customer: { userId } }
    });

    if (!appointment) throw new NotFoundError('Appointment not found or unauthorized');

    if (['COMPLETED', 'CANCELLED'].includes(appointment.status)) {
      throw new AppError('Cannot cancel an appointment in this state', 400);
    }

    await prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    await prisma.appointmentService.updateMany({
      where: { appointmentId: id },
      data: { status: 'CANCELLED' }
    });

    sendSuccess(res, { message: 'Appointment cancelled successfully' });
  } catch (error) {
    next(error);
  }
};

import { generateAppointmentQR } from '../utils/qr.service.js';

export const getBookingQR = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { customer: true }
    });

    if (!appointment) throw new NotFoundError('Appointment not found');
    if (appointment.customer.userId !== userId) throw new AppError('Unauthorized access to this appointment', 403);

    let qrBase64;
    // Generate new QR code dynamically (updates the DB with new token on every request for security)
    if (appointment.status !== 'CANCELLED' && appointment.status !== 'COMPLETED') {
      qrBase64 = await generateAppointmentQR(id);
    }

    sendSuccess(res, { qrBase64 });
  } catch (error) {
    next(error);
  }
};

export const getWallets = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const customers = await prisma.customer.findMany({
      where: { userId },
      include: {
        tenant: { select: { name: true } }
      }
    });

    const wallets = customers.map(c => ({
      tenantId: c.tenantId,
      tenantName: c.tenant.name,
      balance: c.walletBalance,
      loyaltyPoints: c.loyaltyPoints
    }));

    sendSuccess(res, { wallets });
  } catch (error) {
    next(error);
  }
};

export const topUpWallet = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { tenantId } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      throw new AppError('Top-up amount must be greater than zero', 400);
    }

    const customer = await prisma.customer.findFirst({
      where: { userId, tenantId }
    });

    if (!customer) throw new NotFoundError('Customer not found for this tenant');

    // In a real production scenario, you would verify payment intent from Stripe here before crediting.
    // For MVP, we will mock the successful payment and just credit the wallet.
    
    const updatedCustomer = await prisma.customer.update({
      where: { id: customer.id },
      data: { walletBalance: { increment: amount } }
    });

    sendSuccess(res, { message: 'Wallet topped up successfully', newBalance: updatedCustomer.walletBalance });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, phone } = req.body;

    const updatedProfile = await prisma.userProfile.update({
      where: { userId },
      data: {
        firstName,
        lastName,
        phone
      }
    });

    if (phone) {
      await prisma.user.update({
        where: { id: userId },
        data: { phone }
      });
    }

    sendSuccess(res, { profile: updatedProfile });
  } catch (error) {
    next(error);
  }
};
