import bcrypt from 'bcryptjs';
import { prisma } from '../utils/db.js';
import { sendSuccess } from '../utils/response.util.js';
import { NotFoundError } from '../utils/errors.util.js';
import { logActivity } from '../utils/logger.js';

// Helper to find or create a global role by name
const findOrCreateGlobalRole = async (name, priority, description) => {
  let role = await prisma.role.findFirst({ where: { name, tenantId: null } });
  if (!role) {
    role = await prisma.role.create({
      data: { name, priority, description }
    });
  }
  return role;
};

export const getWorkers = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    
    const workers = await prisma.workerProfile.findMany({
      where: { tenantId },
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
    const { email, firstName, lastName, password, role, title, bio, baseCommissionRate, schedules, services } = req.body;

    let user = await prisma.user.findUnique({
      where: { email }
    });

    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    if (!user) {
      // Create user with password and profile
      user = await prisma.user.create({
        data: {
          email,
          tenantId, // Ensure they are scoped to this tenant
          passwordHash,
          profile: {
            create: {
              firstName: firstName || 'New',
              lastName: lastName || 'Staff'
            }
          }
        }
      });
    } else if (passwordHash && !user.passwordHash) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, tenantId }
      });
    }

    // Assign the proper Role
    const roleName = role === 'RECEPTIONIST' ? 'RECEPTIONIST' : 'WORKER';
    const roleObj = await findOrCreateGlobalRole(roleName, 5, `Salon ${roleName}`);
    
    // Check if role already assigned
    const existingUserRole = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId: user.id, roleId: roleObj.id } }
    });
    
    if (!existingUserRole) {
      await prisma.userRole.create({
        data: { userId: user.id, roleId: roleObj.id }
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

// --- SHIFTS & ATTENDANCE ---

export const getShifts = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const shifts = await prisma.shift.findMany({
      where: { tenantId },
      include: { workerProfile: { include: { user: { include: { profile: true } } } } }
    });
    sendSuccess(res, shifts);
  } catch (error) {
    next(error);
  }
};

export const saveShifts = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { shifts } = req.body; // array of { workerProfileId, dayOfWeek, startTime, endTime }

    // For simplicity, we just clear and recreate the shifts for the involved workers.
    const workerIds = [...new Set(shifts.map(s => s.workerProfileId))];

    await prisma.shift.deleteMany({
      where: { tenantId, workerProfileId: { in: workerIds } }
    });

    const newShifts = await prisma.shift.createMany({
      data: shifts.map(s => ({
        tenantId,
        workerProfileId: s.workerProfileId,
        dayOfWeek: parseInt(s.dayOfWeek),
        startTime: s.startTime,
        endTime: s.endTime
      }))
    });

    sendSuccess(res, { message: 'Shifts saved successfully', count: newShifts.count });
  } catch (error) {
    next(error);
  }
};

export const clockInOut = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { workerProfileId, type } = req.body; // type: 'IN' or 'OUT'

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await prisma.attendance.findUnique({
      where: { workerProfileId_date: { workerProfileId, date: today } }
    });

    if (!attendance) {
      if (type === 'OUT') throw new Error('Cannot clock out without clocking in first.');
      attendance = await prisma.attendance.create({
        data: {
          tenantId,
          workerProfileId,
          date: today,
          clockIn: new Date(),
          status: 'PRESENT'
        }
      });
    } else {
      if (type === 'IN') throw new Error('Already clocked in today.');
      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: { clockOut: new Date() }
      });
    }

    sendSuccess(res, attendance);
  } catch (error) {
    next(error);
  }
};

// --- DOCUMENTS & COMPLIANCE ---

export const getWorkerDocuments = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params; // Worker profile ID

    const docs = await prisma.workerDocument.findMany({
      where: { tenantId, workerProfileId: id }
    });
    sendSuccess(res, docs);
  } catch (error) {
    next(error);
  }
};

export const addWorkerDocument = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params; // Worker profile ID
    const { documentType, documentNumber, expirationDate } = req.body;

    const doc = await prisma.workerDocument.create({
      data: {
        tenantId,
        workerProfileId: id,
        documentType,
        documentNumber,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        isVerified: false
      }
    });

    sendSuccess(res, doc, 201);
  } catch (error) {
    next(error);
  }
};
