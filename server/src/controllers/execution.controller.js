import { prisma } from '../utils/db.js';
import { sendSuccess } from '../utils/response.util.js';
import { AppError, NotFoundError } from '../utils/errors.util.js';
import { generateInvoiceFromAppointment } from '../services/billing.service.js';
import { generateAppointmentQR } from '../utils/qr.service.js';

export const getQR = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const tenantId = req.user.tenantId;

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId }
    });

    if (!appointment) throw new NotFoundError('Appointment not found');

    // Access control:
    // If the user is a CUSTOMER, they must own the appointment
    // If the user belongs to a tenant (Owner/Worker), they must belong to the appointment's tenant
    const userRoleNames = req.user.userRoles?.map(ur => ur.role?.name) || [];
    const isCustomer = userRoleNames.includes('CUSTOMER');
    
    if (isCustomer) {
      if (appointment.customerId !== req.user.id) {
        throw new AppError('Unauthorized access to this appointment', 403);
      }
    } else {
      if (appointment.tenantId !== tenantId) {
        throw new AppError('Unauthorized access to this appointment', 403);
      }
    }

    if (!appointment) throw new NotFoundError('Appointment not found');
    
    const qrBase64 = await generateAppointmentQR(appointmentId);

    sendSuccess(res, { qrBase64 });
  } catch (error) {
    next(error);
  }
};

export const scanQR = async (req, res, next) => {
  try {
    const { qrToken } = req.body;
    const tenantId = req.user.tenantId;

    if (!qrToken) throw new AppError('QR Token is required', 400);

    const workerProfile = await prisma.workerProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (!workerProfile) {
      throw new AppError('User is not a registered worker', 403);
    }

    const appointment = await prisma.appointment.findUnique({
      where: { qrToken },
      include: { services: { include: { service: true } }, customer: true }
    });

    if (!appointment) throw new NotFoundError('Invalid or expired QR code');
    if (appointment.tenantId !== tenantId) throw new AppError('Unauthorized access to this appointment', 403);
    
    // Check expiry and usage
    if (appointment.qrUsedAt) {
      throw new AppError('This QR code has already been used', 400);
    }
    if (appointment.qrExpiresAt && new Date() > appointment.qrExpiresAt) {
      throw new AppError('This QR code has expired', 400);
    }

    if (['COMPLETED', 'CANCELLED'].includes(appointment.status)) {
      throw new AppError(`Cannot scan a ${appointment.status} appointment`, 400);
    }

    // Auto-assign the scanning worker to all pending services and mark QR as used
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { qrUsedAt: new Date() }
    });
    await prisma.appointmentService.updateMany({
      where: { appointmentId: appointment.id, status: 'PENDING' },
      data: { workerProfileId: workerProfile.id }
    });

    // Log the scan execution
    await prisma.executionLog.create({
      data: {
        tenantId,
        appointmentId: appointment.id,
        workerProfileId: workerProfile.id,
        action: 'QR_SCANNED'
      }
    });

    // We fetch again to get the updated workerProfileIds
    const updatedAppointment = await prisma.appointment.findUnique({
      where: { id: appointment.id },
      include: {
        customer: true,
        services: {
          include: { service: true, worker: true }
        }
      }
    });

    sendSuccess(res, updatedAppointment);
  } catch (error) {
    next(error);
  }
};

export const startService = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const tenantId = req.user.tenantId;

    const workerProfile = await prisma.workerProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (!workerProfile) throw new AppError('Worker profile not found', 403);

    const appointment = await prisma.appointment.update({
      where: { id: appointmentId, tenantId },
      data: { status: 'IN_PROGRESS' }
    });

    await prisma.executionLog.create({
      data: {
        tenantId,
        appointmentId: appointment.id,
        workerProfileId: workerProfile.id,
        action: 'STARTED'
      }
    });

    sendSuccess(res, appointment);
  } catch (error) {
    next(error);
  }
};

export const pauseService = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const tenantId = req.user.tenantId;

    const workerProfile = await prisma.workerProfile.findUnique({ where: { userId: req.user.id } });
    if (!workerProfile) throw new AppError('Worker profile not found', 403);

    const appointment = await prisma.appointment.update({
      where: { id: appointmentId, tenantId },
      data: { status: 'IN_PROGRESS' } // Or add a 'PAUSED' status to schema
    });

    await prisma.executionLog.create({
      data: { tenantId, appointmentId: appointment.id, workerProfileId: workerProfile.id, action: 'PAUSED' }
    });
    sendSuccess(res, appointment);
  } catch (error) { next(error); }
};

export const resumeService = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const tenantId = req.user.tenantId;

    const workerProfile = await prisma.workerProfile.findUnique({ where: { userId: req.user.id } });
    if (!workerProfile) throw new AppError('Worker profile not found', 403);

    const appointment = await prisma.appointment.update({
      where: { id: appointmentId, tenantId },
      data: { status: 'IN_PROGRESS' } 
    });

    await prisma.executionLog.create({
      data: { tenantId, appointmentId: appointment.id, workerProfileId: workerProfile.id, action: 'RESUMED' }
    });
    sendSuccess(res, appointment);
  } catch (error) { next(error); }
};

export const completeService = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const { notes, productsUsed } = req.body; // New advanced fields
    const tenantId = req.user.tenantId;

    const workerProfile = await prisma.workerProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (!workerProfile) throw new AppError('Worker profile not found', 403);

    let updatedNotes = notes;
    
    // If existing notes exist, append
    const existing = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (existing?.notes && notes) {
      updatedNotes = `${existing.notes}\n[Worker Note]: ${notes}`;
    }

    const appointment = await prisma.appointment.update({
      where: { id: appointmentId, tenantId },
      data: { 
        status: 'COMPLETED',
        notes: updatedNotes || existing?.notes
      },
      include: {
        customer: true,
        services: true
      }
    });

    await prisma.appointmentService.updateMany({
      where: { appointmentId: appointment.id },
      data: { status: 'COMPLETED' }
    });

    await prisma.executionLog.create({
      data: {
        tenantId,
        appointmentId: appointment.id,
        workerProfileId: workerProfile.id,
        action: 'COMPLETED'
      }
    });

    // Trigger the automated Billing Engine!
    // We pass the productsUsed array into the future hook logic we built
    const invoice = await generateInvoiceFromAppointment(appointment.id, tenantId, productsUsed);

    sendSuccess(res, { message: 'Service completed successfully', appointment, invoice });
  } catch (error) {
    next(error);
  }
};
