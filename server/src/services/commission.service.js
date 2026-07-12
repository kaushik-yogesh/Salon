import { prisma } from '../utils/db.js';

export const calculateWorkerPayouts = async (tenantId, periodStart, periodEnd) => {
  // 1. Fetch all fully PAID invoices in this period
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      status: 'PAID',
      createdAt: {
        gte: new Date(periodStart),
        lte: new Date(periodEnd)
      }
    },
    include: {
      lineItems: true
    }
  });

  if (invoices.length === 0) {
    return { totalPayout: 0, workerItems: [] };
  }

  // 2. Aggregate line items by workerProfileId
  const workerTotals = new Map();

  for (const invoice of invoices) {
    for (const item of invoice.lineItems) {
      if (!item.workerProfileId) continue;

      if (!workerTotals.has(item.workerProfileId)) {
        workerTotals.set(item.workerProfileId, {
          workerProfileId: item.workerProfileId,
          grossSales: 0,
          tipsTotal: 0
        });
      }

      const totals = workerTotals.get(item.workerProfileId);

      if (item.type === 'TIP') {
        totals.tipsTotal += item.unitPrice * item.quantity;
      } else {
        // Exclude tax from commissionable gross sales
        totals.grossSales += item.unitPrice * item.quantity;
      }
    }
  }

  // 3. Apply baseCommissionRate for each worker
  let grandTotalPayout = 0;
  const workerItems = [];

  for (const [workerId, totals] of workerTotals.entries()) {
    const worker = await prisma.workerProfile.findUnique({
      where: { id: workerId }
    });

    if (!worker) continue;

    const commissionRate = worker.baseCommissionRate || 0;
    const commissionTotal = totals.grossSales * commissionRate;
    // Base salary is assumed 0 for pure commission structure, can be expanded later
    const baseSalary = 0; 

    const netPayout = baseSalary + commissionTotal + totals.tipsTotal;

    grandTotalPayout += netPayout;

    workerItems.push({
      workerProfileId: workerId,
      baseSalary,
      commissionTotal,
      tipsTotal: totals.tipsTotal,
      netPayout
    });
  }

  return {
    totalPayout: grandTotalPayout,
    workerItems
  };
};
