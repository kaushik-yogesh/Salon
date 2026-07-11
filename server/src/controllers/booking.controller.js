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

    const where = {
      tenantId,
      ...(branchId && { branchId }),
      ...(date && { date: new Date(date) })
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

