import { prisma } from '../utils/db.js';
import { sendSuccess } from '../utils/response.util.js';
import { AppError } from '../utils/errors.util.js';

export const getMyEarnings = async (req, res, next) => {
  try {


    const workerProfile = await prisma.workerProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (!workerProfile) throw new AppError('Worker profile not found', 403);

    const earnings = await prisma.salaryRunItem.findMany({
      where: { workerProfileId: workerProfile.id },
      include: {
        salaryRun: true
      },
      orderBy: {
        salaryRun: { periodStart: 'desc' }
      }
    });

    // Calculate total pending payout (DRAFT status)
    const pendingEarnings = earnings
      .filter(e => e.salaryRun.status === 'DRAFT')
      .reduce((acc, curr) => acc + curr.netPayout, 0);

    const totalPaid = earnings
      .filter(e => e.salaryRun.status === 'PAID')
      .reduce((acc, curr) => acc + curr.netPayout, 0);

    sendSuccess(res, {
      history: earnings,
      summary: {
        pendingEarnings,
        totalPaid
      }
    });
  } catch (error) {
    next(error);
  }
};
