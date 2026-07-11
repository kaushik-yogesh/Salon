import { prisma } from '../utils/db.js';

/**
 * Automates worker compensation immediately after billing.
 */
export const calculateCommission = async (invoiceId, tenantId) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      lineItems: true
    }
  });

  if (!invoice) throw new Error('Invoice not found');

  const now = new Date();
  // Simple logic to find or create the current month's SalaryRun for the tenant
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  let salaryRun = await prisma.salaryRun.findFirst({
    where: {
      tenantId,
      periodStart: currentMonthStart,
      status: 'DRAFT'
    }
  });

  if (!salaryRun) {
    salaryRun = await prisma.salaryRun.create({
      data: {
        tenantId,
        periodStart: currentMonthStart,
        periodEnd: currentMonthEnd,
        status: 'DRAFT'
      }
    });
  }

  // Iterate over invoice line items that have a worker assigned
  for (const item of invoice.lineItems) {
    if (!item.workerProfileId || item.type !== 'SERVICE') continue;

    const workerProfile = await prisma.workerProfile.findUnique({
      where: { id: item.workerProfileId },
      include: {
        services: {
          where: { serviceId: item.referenceId }
        }
      }
    });

    if (!workerProfile) continue;

    // Determine commission rate (fallback to base if specific service override doesn't exist)
    let commissionRate = workerProfile.baseCommissionRate;
    if (workerProfile.services.length > 0 && workerProfile.services[0].overrideCommission !== null) {
      commissionRate = workerProfile.services[0].overrideCommission;
    }

    const commissionEarned = (commissionRate / 100) * item.unitPrice;

    // Find if this worker already has a run item in the current period
    let runItem = await prisma.salaryRunItem.findFirst({
      where: {
        salaryRunId: salaryRun.id,
        workerProfileId: workerProfile.id
      }
    });

    // Example Advanced Payroll Logic
    // Give a $20 bonus if the invoice total was > $150
    let bonusAmount = 0;
    if (invoice.grandTotal > 150) {
      bonusAmount = 20.0;
    }
    
    // Calculate potential tips from invoice line items (type = TIP)
    const tips = invoice.lineItems
      .filter(line => line.type === 'TIP' && line.workerProfileId === workerProfile.id)
      .reduce((sum, line) => sum + line.totalPrice, 0);

    if (runItem) {
      await prisma.salaryRunItem.update({
        where: { id: runItem.id },
        data: {
          commissionTotal: { increment: commissionEarned },
          tipsTotal: { increment: tips },
          bonusAmount: { increment: bonusAmount },
          netPayout: { increment: commissionEarned + tips + bonusAmount },
          updatedAt: new Date()
        }
      });
    } else {
      await prisma.salaryRunItem.create({
        data: {
          salaryRunId: salaryRun.id,
          workerProfileId: workerProfile.id,
          baseSalary: 0, 
          commissionTotal: commissionEarned,
          tipsTotal: tips,
          bonusAmount: bonusAmount,
          overtimeHours: 0,
          netPayout: commissionEarned + tips + bonusAmount
        }
      });
    }
  }

  // Update total payout for the salary run
  const allRunItems = await prisma.salaryRunItem.findMany({
    where: { salaryRunId: salaryRun.id }
  });

  const totalPayout = allRunItems.reduce((acc, item) => acc + item.netPayout, 0);

  await prisma.salaryRun.update({
    where: { id: salaryRun.id },
    data: { totalPayout }
  });

  return salaryRun;
};
