import { prisma } from '../utils/db.js';
import { sendSuccess } from '../utils/response.util.js';

export const getDashboardMetrics = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { startDate, endDate } = req.query;

    const dateFilter = {
      gte: new Date(startDate),
      lte: new Date(endDate)
    };

    // 1. Gross Revenue (from PAID Invoices)
    const invoices = await prisma.invoice.aggregate({
      where: {
        tenantId,
        status: 'PAID',
        createdAt: dateFilter
      },
      _sum: {
        grandTotal: true
      }
    });
    const grossRevenue = invoices._sum.grandTotal || 0;

    // 2. Payroll (from SalaryRuns)
    const payroll = await prisma.salaryRun.aggregate({
      where: {
        tenantId,
        status: { in: ['APPROVED', 'PAID'] },
        createdAt: dateFilter
      },
      _sum: {
        totalPayout: true
      }
    });
    const totalPayroll = payroll._sum.totalPayout || 0;

    // 3. Operating Expenses (from Expenses)
    const expenses = await prisma.expense.aggregate({
      where: {
        tenantId,
        status: 'APPROVED',
        date: dateFilter
      },
      _sum: {
        amount: true
      }
    });
    const operatingExpenses = expenses._sum.amount || 0;

    // 4. Net Profit
    const netProfit = grossRevenue - (totalPayroll + operatingExpenses);

    sendSuccess(res, {
      period: { startDate, endDate },
      metrics: {
        grossRevenue,
        totalPayroll,
        operatingExpenses,
        netProfit
      }
    });
  } catch (error) {
    next(error);
  }
};
