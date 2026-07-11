import { prisma } from '../utils/db.js';
import { AppError } from '../utils/errors.util.js';

export const validateWorkerAvailability = async (tenantId, branchId, workerProfileId, requestedStartTime, requestedEndTime) => {
  const reqStart = new Date(requestedStartTime);
  const reqEnd = new Date(requestedEndTime);

  // 1. Validate Worker Profile exists & belongs to tenant
  const worker = await prisma.workerProfile.findUnique({
    where: { id: workerProfileId, tenantId, isActive: true }
  });

  if (!worker) {
    throw new AppError('Worker not found or inactive', 400);
  }

  // 2. Validate against Schedule (Working hours for this day of week)
  const dayOfWeek = reqStart.getDay(); // 0-6 (Sun-Sat)
  const schedule = await prisma.workerSchedule.findUnique({
    where: {
      workerProfileId_dayOfWeek: {
        workerProfileId,
        dayOfWeek
      }
    }
  });

  if (!schedule || !schedule.isWorking) {
    throw new AppError('Worker is not scheduled to work on this day', 400);
  }

  // Convert schedule string times (e.g., "09:00") to Date objects for comparison
  const schedStartStr = schedule.startTime.split(':');
  const schedEndStr = schedule.endTime.split(':');
  
  const schedStart = new Date(reqStart);
  schedStart.setHours(parseInt(schedStartStr[0], 10), parseInt(schedStartStr[1], 10), 0, 0);

  const schedEnd = new Date(reqStart);
  schedEnd.setHours(parseInt(schedEndStr[0], 10), parseInt(schedEndStr[1], 10), 0, 0);

  if (reqStart < schedStart || reqEnd > schedEnd) {
    throw new AppError(`Requested time is outside worker's scheduled hours (${schedule.startTime} - ${schedule.endTime})`, 400);
  }

  // 3. Validate against Approved Time-Off Requests
  const timeOffConflict = await prisma.timeOffRequest.findFirst({
    where: {
      workerProfileId,
      status: 'APPROVED',
      startDate: { lte: reqEnd },
      endDate: { gte: reqStart }
    }
  });

  if (timeOffConflict) {
    throw new AppError('Worker has approved time-off during this period', 400);
  }

  // 4. Validate against existing Overlapping Appointments (with 15 min buffer)
  const bufferedEnd = new Date(reqEnd);
  bufferedEnd.setMinutes(bufferedEnd.getMinutes() + 15);

  const bufferedStart = new Date(reqStart);
  bufferedStart.setMinutes(bufferedStart.getMinutes() - 15);

  const overlappingAppointment = await prisma.appointmentService.findFirst({
    where: {
      workerProfileId,
      appointment: {
        status: { notIn: ['CANCELLED', 'NO_SHOW'] }
      },
      // Conflict condition with buffer
      startTime: { lt: bufferedEnd },
      endTime: { gt: bufferedStart }
    },
    include: { appointment: true }
  });

  if (overlappingAppointment) {
    throw new AppError('Worker is already booked for an overlapping time slot (including buffer time)', 409); // 409 Conflict
  }

  // 5. Validate Branch Capacity (Chair Availability)
  if (branchId) {
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (branch) {
      const concurrentServices = await prisma.appointmentService.count({
        where: {
          appointment: {
            branchId,
            status: { notIn: ['CANCELLED', 'NO_SHOW'] }
          },
          startTime: { lt: reqEnd },
          endTime: { gt: reqStart }
        }
      });

      if (concurrentServices >= branch.capacity) {
        throw new AppError('Branch capacity reached for this time slot. No chairs available.', 409);
      }
    }
  }

  return true;
};
