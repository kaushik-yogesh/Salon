import { prisma } from '../utils/db.js';
import { sendSuccess } from '../utils/response.util.js';

import { logActivity } from '../utils/logger.js';
import { calculateWorkerPayouts } from '../services/commission.service.js';

export const generateSalaryRun = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { periodStart, periodEnd } = req.body;

    // Run the payout algorithm
    const payoutData = await calculateWorkerPayouts(tenantId, periodStart, periodEnd);

    // Create the DRAFT salary run
    const salaryRun = await prisma.salaryRun.create({
      data: {
        tenantId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        totalPayout: payoutData.totalPayout,
        status: 'DRAFT',
        items: {
          create: payoutData.workerItems
        }
      },
      include: { items: true }
    });

    await logActivity({
      tenantId,
      actorId: req.user.id,
      action: 'SALARY_RUN_GENERATED',
      resourceType: 'SalaryRun',
      resourceId: salaryRun.id,
      ipAddress: req.ip
    });

    sendSuccess(res, salaryRun, 201);
  } catch (error) {
    next(error);
  }
};

export const getSalaryRuns = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;

    const runs = await prisma.salaryRun.findMany({
      where: { tenantId },
      include: { 
        items: {
          include: { workerProfile: { include: { user: { include: { profile: true } } } } }
        } 
      },
      orderBy: { createdAt: 'desc' }
    });

    sendSuccess(res, runs);
  } catch (error) {
    next(error);
  }
};
