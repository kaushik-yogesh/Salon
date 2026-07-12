import { prisma } from '../utils/db.js';
import { sendSuccess } from '../utils/response.util.js';
import { logActivity } from '../utils/logger.js';
import { validateWorkerAvailability } from '../services/appointment.service.js';
import { notificationQueue } from '../queue/notification.queue.js';
import { generateAppointmentQR } from '../utils/qr.service.js';

export const getAppointments = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { branchId, date } = req.query;

    let dateRange = {};
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);
      dateRange = {
        date: {
          gte: startOfDay,
          lt: endOfDay
        }
      };
    }

    const where = {
      tenantId,
      ...(branchId && { branchId }),
      ...dateRange
    };
    
    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        customer: true,
        services: {
          include: {
            service: true,
            worker: { include: { user: { include: { profile: true } } } }
          }
        }
      },
      orderBy: { date: 'asc' }
    });

    sendSuccess(res, appointments);
  } catch (error) {
    next(error);
  }
};

export const createAppointment = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { branchId, customerId, date, notes, services } = req.body;

    // Validate worker availability sequentially to catch conflicts early
    for (const s of services) {
      await validateWorkerAvailability(tenantId, branchId, s.workerProfileId, s.startTime, s.endTime);
    }

    let totalPrice = 0;
    let totalDuration = 0;
    
    const serviceData = services.map(s => {
      totalPrice += s.price;
      const start = new Date(s.startTime);
      const end = new Date(s.endTime);
      totalDuration += (end.getTime() - start.getTime()) / 60000;
      
      return {
        serviceId: s.serviceId,
        workerProfileId: s.workerProfileId,
        startTime: start,
        endTime: end,
        price: s.price
      };
    });

    const appointment = await prisma.appointment.create({
      data: {
        tenantId,
        branchId,
        customerId,
        date: new Date(date),
        totalPrice,
        totalDuration,
        notes,
        services: {
          create: serviceData
        }
      },
      include: { services: true }
    });

    // Generate QR code for the appointment
    let qrBase64 = null;
    try {
      qrBase64 = await generateAppointmentQR(appointment.id);
    } catch (qrErr) {
      console.error('[Booking] QR generation failed (non-fatal):', qrErr.message);
    }

    await logActivity({
      tenantId,
      actorId: req.user.id,
      action: 'APPOINTMENT_CREATED',
      resourceType: 'Appointment',
      resourceId: appointment.id,
      ipAddress: req.ip
    });

    // Dispatch asynchronous notification jobs
    const notificationPayload = `Your appointment is confirmed for ${new Date(date).toLocaleString()}. Present your QR code upon arrival.`;

    try {
      await notificationQueue.add('sendEmail', {
        tenantId,
        customerId,
        type: 'EMAIL',
        subject: 'Appointment Confirmation',
        body: notificationPayload
      });

      await notificationQueue.add('sendSMS', {
        tenantId,
        customerId,
        type: 'SMS',
        subject: 'Appointment Confirmation',
        body: notificationPayload
      });

      await notificationQueue.add('fireWebhook', {
        tenantId,
        type: 'WEBHOOK',
        subject: 'APPOINTMENT_CREATED',
        body: JSON.stringify(appointment)
      });
    } catch (queueErr) {
      console.error('[Booking] Notification queue failed (non-fatal):', queueErr.message);
    }

    // Refetch with QR token included
    const finalAppointment = await prisma.appointment.findUnique({
      where: { id: appointment.id },
      include: { services: true }
    });

    sendSuccess(res, { ...finalAppointment, qrBase64 }, 201);
  } catch (error) {
    next(error);
  }
};

export const updateAppointment = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const { date, notes, services } = req.body;

    const appointment = await prisma.appointment.findUnique({
      where: { id, tenantId },
      include: { services: true }
    });

    if (!appointment) throw new AppError('Appointment not found', 404);
    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status)) {
      throw new AppError('Cannot update an appointment in this state', 400);
    }

    let updateData = { notes };
    if (date) updateData.date = new Date(date);

    // If services are provided, we must replace them
    if (services && services.length > 0) {
      // Validate worker availability sequentially
      for (const s of services) {
        await validateWorkerAvailability(tenantId, appointment.branchId, s.workerProfileId, s.startTime, s.endTime, id);
      }

      let totalPrice = 0;
      let totalDuration = 0;
      const serviceData = services.map(s => {
        totalPrice += s.price;
        const start = new Date(s.startTime);
        const end = new Date(s.endTime);
        totalDuration += (end.getTime() - start.getTime()) / 60000;
        return {
          serviceId: s.serviceId,
          workerProfileId: s.workerProfileId,
          startTime: start,
          endTime: end,
          price: s.price
        };
      });

      updateData.totalPrice = totalPrice;
      updateData.totalDuration = totalDuration;
      
      // We use a transaction to delete old services and create new ones
      await prisma.$transaction([
        prisma.appointmentService.deleteMany({ where: { appointmentId: id } }),
        prisma.appointment.update({
          where: { id },
          data: {
            ...updateData,
            services: { create: serviceData }
          }
        })
      ]);
    } else {
      await prisma.appointment.update({
        where: { id },
        data: updateData
      });
    }

    await logActivity({
      tenantId,
      actorId: req.user.id,
      action: 'APPOINTMENT_UPDATED',
      resourceType: 'Appointment',
      resourceId: id,
      ipAddress: req.ip
    });

    const updatedAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: { services: true }
    });

    sendSuccess(res, updatedAppointment);
  } catch (error) {
    next(error);
  }
};

export const updateAppointmentStatus = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const { status } = req.body;

    const appointment = await prisma.appointment.findUnique({ where: { id, tenantId } });
    if (!appointment) throw new AppError('Appointment not found', 404);

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: { status }
    });

    if (status === 'CANCELLED' || status === 'NO_SHOW') {
      await prisma.appointmentService.updateMany({
        where: { appointmentId: id },
        data: { status }
      });
    }

    await logActivity({
      tenantId,
      actorId: req.user.id,
      action: 'APPOINTMENT_STATUS_UPDATED',
      resourceType: 'Appointment',
      resourceId: id,
      newValues: { status },
      ipAddress: req.ip
    });

    sendSuccess(res, updatedAppointment);
  } catch (error) {
    next(error);
  }
};

export const getWaitlist = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const waitlist = await prisma.waitlist.findMany({
      where: { tenantId },
      include: { customer: true },
      orderBy: { createdAt: 'asc' }
    });
    sendSuccess(res, waitlist);
  } catch (error) {
    next(error);
  }
};

export const createWaitlist = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { customerId, preferredDate, notes } = req.body;

    const entry = await prisma.waitlist.create({
      data: {
        tenantId,
        customerId,
        preferredDate: new Date(preferredDate),
        notes
      },
      include: { customer: true }
    });

    sendSuccess(res, entry, 201);
  } catch (error) {
    next(error);
  }
};

export const updateWaitlistStatus = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const { status } = req.body;

    const entry = await prisma.waitlist.update({
      where: { id, tenantId },
      data: { status }
    });

    sendSuccess(res, entry);
  } catch (error) {
    next(error);
  }
};

