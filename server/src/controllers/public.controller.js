import { prisma } from '../utils/db.js';
import { sendSuccess } from '../utils/response.util.js';
import { AppError, NotFoundError } from '../utils/errors.util.js';
import { notificationQueue } from '../queue/notification.queue.js';

export const getTenantProfile = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        primaryColor: true,
        businessHours: true,
        defaultCurrency: true,
        defaultTimezone: true
      }
    });

    if (!tenant) throw new NotFoundError('Salon not found');

    sendSuccess(res, tenant);
  } catch (error) {
    next(error);
  }
};

export const getTenantCatalog = async (req, res, next) => {
  try {
    const { tenantId } = req.params;

    const categories = await prisma.serviceCategory.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        services: {
          where: { isActive: true }
        }
      }
    });

    sendSuccess(res, categories);
  } catch (error) {
    next(error);
  }
};

export const getTenantStaff = async (req, res, next) => {
  try {
    const { tenantId } = req.params;

    const staff = await prisma.workerProfile.findMany({
      where: { tenantId, isActive: true },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    });

    sendSuccess(res, staff);
  } catch (error) {
    next(error);
  }
};

export const createPublicBooking = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { firstName, lastName, phone, email, date, services } = req.body;

    if (!services || services.length === 0) {
      throw new AppError('At least one service is required', 400);
    }

    // 1. Find or create Customer
    let customer = null;
    if (phone) {
      customer = await prisma.customer.findFirst({
        where: { tenantId, phone }
      });
    } else if (email) {
      customer = await prisma.customer.findFirst({
        where: { tenantId, email }
      });
    }

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          tenantId,
          firstName,
          lastName,
          phone,
          email
        }
      });
    }

    // 2. Create the Appointment
    const appointment = await prisma.appointment.create({
      data: {
        tenantId,
        customerId: customer.id,
        date: new Date(date),
        status: 'PENDING',
        notes: 'Booked online via Portal',
        services: {
          create: services.map(s => ({
            serviceId: s.serviceId,
            workerProfileId: s.workerProfileId || null,
            startTime: new Date(s.startTime),
            endTime: new Date(s.endTime),
            price: s.price
          }))
        }
      },
      include: {
        customer: true,
        services: { include: { service: true, workerProfile: { include: { user: { include: { profile: true } } } } } }
      }
    });

    // 3. Dispatch Notifications
    try {
      const notificationPayload = JSON.stringify({
        appointmentId: appointment.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        date: appointment.date,
        services: appointment.services.map(s => s.service.name).join(', ')
      });

      if (customer.phone) {
        await notificationQueue.add('sendSMS', {
          tenantId,
          customerId: customer.id,
          type: 'SMS',
          subject: 'Appointment Requested',
          body: `Hi ${customer.firstName}, your appointment request at SalonOS is pending confirmation.`,
          toPhone: customer.phone
        });
      }

      await notificationQueue.add('fireWebhook', {
        tenantId,
        type: 'WEBHOOK',
        subject: 'APPOINTMENT_CREATED',
        body: notificationPayload
      });
    } catch (queueErr) {
      console.error('[Public Booking] Queue failed:', queueErr.message);
    }

    sendSuccess(res, appointment, 201);
  } catch (error) {
    next(error);
  }
};
