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

    // 1. Gross Revenue & Tax (from PAID Invoices)
    const paidInvoices = await prisma.invoice.aggregate({
      where: {
        tenantId,
        status: 'PAID',
        createdAt: dateFilter
      },
      _sum: {
        grandTotal: true,
        taxTotal: true
      }
    });
    const grossRevenue = paidInvoices._sum.grandTotal || 0;
    const totalTaxCollected = paidInvoices._sum.taxTotal || 0;

    // 2. Outstanding Receivables (from DRAFT or unpaid Invoices)
    const outstanding = await prisma.invoice.aggregate({
      where: {
        tenantId,
        status: { in: ['DRAFT', 'PARTIALLY_PAID'] } // Note: we don't apply date filter here because all outstanding debt matters
      },
      _sum: {
        grandTotal: true
      }
    });
    const outstandingReceivables = outstanding._sum.grandTotal || 0;

    // 3. Payroll (from SalaryRuns)
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

    // 4. Operating Expenses (from Expenses)
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

    // 5. Net Profit (Simplified: Revenue - Expenses - Payroll)
    const netProfit = grossRevenue - (totalPayroll + operatingExpenses);

    // 6. Recent Activity (Latest 5 Invoices)
    const recentActivity = await prisma.invoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // 7. Outstanding Invoices List
    const outstandingInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        status: { in: ['DRAFT', 'PARTIALLY_PAID'] }
      },
      include: {
        customer: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const { generateInsights } = await import('../utils/ai.service.js');
    const aiInsights = await generateInsights(tenantId);

    sendSuccess(res, {
      period: { startDate, endDate },
      metrics: {
        grossRevenue,
        totalTaxCollected,
        outstandingReceivables,
        totalPayroll,
        operatingExpenses,
        netProfit,
        recentActivity,
        outstandingInvoices,
        aiInsights
      }
    });
  } catch (error) {
    next(error);
  }
};
