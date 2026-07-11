import { prisma } from '../utils/db.js';
import { sendSuccess } from '../utils/response.util.js';
import { NotFoundError } from '../utils/errors.util.js';
import { logActivity } from '../utils/logger.js';

export const getWorkers = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    
    const workers = await prisma.workerProfile.findMany({
      where: { tenantId, isActive: true },
      include: {
        user: { include: { profile: true } },
        services: { include: { service: true } },
        schedules: true,
        timeOff: { where: { status: 'APPROVED' } }
      }
    });

    sendSuccess(res, workers);
  } catch (error) {
    next(error);
  }
};

export const createWorkerProfile = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { email, title, bio, baseCommissionRate, schedules, services } = req.body;

    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Auto-create stub user for the worker to claim later
      user = await prisma.user.create({
        data: {
          email,
          profile: {
            create: {
              firstName: 'New',
              lastName: 'Worker'
            }
          }
        }
      });
    }

    const worker = await prisma.workerProfile.create({
      data: {
        tenantId,
        userId: user.id,
        title,
        bio,
        baseCommissionRate,
        schedules: {
          create: schedules || []
        },
        services: {
          create: services || []
        }
      },
      include: { schedules: true, services: true }
    });

    await logActivity({
      tenantId,
      actorId: req.user.id,
      action: 'WORKER_PROFILE_CREATED',
      resourceType: 'WorkerProfile',
      resourceId: worker.id,
      ipAddress: req.ip
    });

    sendSuccess(res, worker, 201);
  } catch (error) {
    next(error);
  }
};

export const updateWorkerProfile = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const { title, bio, baseCommissionRate, isActive } = req.body;

    const worker = await prisma.workerProfile.findUnique({
      where: { id, tenantId }
    });

    if (!worker) throw new NotFoundError('Worker profile not found');

    const updatedWorker = await prisma.workerProfile.update({
      where: { id },
      data: { title, bio, baseCommissionRate, isActive }
    });

    await logActivity({
      tenantId,
      actorId: req.user.id,
      action: 'WORKER_PROFILE_UPDATED',
      resourceType: 'WorkerProfile',
      resourceId: updatedWorker.id,
      ipAddress: req.ip
    });

    sendSuccess(res, updatedWorker);
  } catch (error) {
    next(error);
  }
};

export const deleteWorkerProfile = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;

    const worker = await prisma.workerProfile.findUnique({
      where: { id, tenantId }
    });

    if (!worker) throw new NotFoundError('Worker profile not found');

    // Soft delete / deactivate
    await prisma.workerProfile.update({
      where: { id },
      data: { isActive: false }
    });

    await logActivity({
      tenantId,
      actorId: req.user.id,
      action: 'WORKER_PROFILE_DEACTIVATED',
      resourceType: 'WorkerProfile',
      resourceId: id,
      ipAddress: req.ip
    });

    sendSuccess(res, { message: 'Worker profile deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateWorkerSchedule = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const { schedules } = req.body; // Array of schedule objects

    const worker = await prisma.workerProfile.findUnique({
      where: { id, tenantId }
    });

    if (!worker) throw new NotFoundError('Worker profile not found');

    // Upsert each schedule to prevent unique constraint violations on [workerProfileId, dayOfWeek]
    const upsertPromises = schedules.map(schedule => 
      prisma.workerSchedule.upsert({
        where: {
          workerProfileId_dayOfWeek: {
            workerProfileId: id,
            dayOfWeek: schedule.dayOfWeek
          }
        },
        update: {
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          isWorking: schedule.isWorking
        },
        create: {
          workerProfileId: id,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          isWorking: schedule.isWorking
        }
      })
    );

    const updatedSchedules = await Promise.all(upsertPromises);

    await logActivity({
      tenantId,
      actorId: req.user.id,
      action: 'WORKER_SCHEDULE_UPDATED',
      resourceType: 'WorkerProfile',
      resourceId: id,
      ipAddress: req.ip
    });

    sendSuccess(res, updatedSchedules);
  } catch (error) {
    next(error);
  }
};

export const requestTimeOff = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const { startDate, endDate, reason } = req.body;

    const worker = await prisma.workerProfile.findUnique({
      where: { id, tenantId }
    });

    if (!worker) throw new NotFoundError('Worker profile not found');

    const request = await prisma.timeOffRequest.create({
      data: {
        workerProfileId: id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason
      }
    });

    sendSuccess(res, request, 201);
  } catch (error) {
    next(error);
  }
};

export const getTimeOffRequests = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params; // worker profile ID

    const worker = await prisma.workerProfile.findUnique({
      where: { id, tenantId }
    });

    if (!worker) throw new NotFoundError('Worker profile not found');
    
    // For MVP, we allow them to fetch if they are the worker or an owner/admin.
    // In production, enforce strictly that req.user.id === worker.userId unless admin.

    const requests = await prisma.timeOffRequest.findMany({
      where: { workerProfileId: id },
      orderBy: { createdAt: 'desc' }
    });

    sendSuccess(res, requests);
  } catch (error) {
    next(error);
  }
};

export const updateTimeOffStatus = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { requestId } = req.params;
    const { status } = req.body;

    // Verify request exists and belongs to this tenant
    const request = await prisma.timeOffRequest.findUnique({
      where: { id: requestId },
      include: { workerProfile: true }
    });

    if (!request || request.workerProfile.tenantId !== tenantId) {
      throw new NotFoundError('Time off request not found');
    }

    const updatedRequest = await prisma.timeOffRequest.update({
      where: { id: requestId },
      data: { status }
    });

    await logActivity({
      tenantId,
      actorId: req.user.id,
      action: `TIME_OFF_${status}`,
      resourceType: 'TimeOffRequest',
      resourceId: requestId,
      ipAddress: req.ip
    });

    sendSuccess(res, updatedRequest);
  } catch (error) {
    next(error);
  }
};
