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
    const { tenantId, branchId, date, services, notes } = req.body;

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
    
    // Simplistic scheduling for now: stack services consecutively starting at 10 AM (for MVP)
    // In reality, this requires full slot calculation
    let currentStartTime = new Date(date);
    currentStartTime.setHours(10, 0, 0, 0); // Temporary placeholder logic for MVP

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
