import { prisma } from './db.js';

/**
 * AI Prediction Engine (Statistical Model)
 * Generates actionable insights based on historical velocity.
 */
export const generateInsights = async (tenantId, branchId = null) => {
  try {
    const insights = [];
    const whereBase = { tenantId, ...(branchId && { branchId }) };

    // 1. Revenue Forecast (Next 7 Days based on last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const pastInvoices = await prisma.invoice.findMany({
      where: { ...whereBase, status: 'PAID', createdAt: { gte: thirtyDaysAgo } },
      select: { grandTotal: true, createdAt: true }
    });

    if (pastInvoices.length > 5) {
      const totalRevenue30Days = pastInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
      const dailyAverage = totalRevenue30Days / 30;
      const next7DaysProjection = dailyAverage * 7;
      
      insights.push({
        type: 'REVENUE',
        severity: 'INFO',
        message: `Based on your recent velocity, you are projected to generate $${next7DaysProjection.toFixed(2)} in revenue over the next 7 days.`
      });
    }

    // 2. Inventory Depletion Forecast
    const products = await prisma.product.findMany({
      where: { ...whereBase, stockQuantity: { gt: 0 } },
      include: {
        transactions: {
          where: { type: 'SALE', createdAt: { gte: thirtyDaysAgo } },
          select: { quantity: true }
        }
      }
    });

    for (const product of products) {
      if (product.transactions.length === 0) continue;
      
      // Calculate daily burn rate (negative quantity means sale)
      const totalBurn30Days = product.transactions.reduce((sum, tx) => sum + Math.abs(tx.quantity), 0);
      const dailyBurnRate = totalBurn30Days / 30;

      if (dailyBurnRate > 0) {
        const daysUntilEmpty = Math.floor(product.stockQuantity / dailyBurnRate);
        
        if (daysUntilEmpty <= 7) {
          insights.push({
            type: 'INVENTORY',
            severity: 'WARNING',
            message: `Heads up! ${product.name} is selling fast. Based on the current burn rate, it will run out of stock in ${daysUntilEmpty} days.`
          });
        }
      }
    }

    // Ensure we always have at least one mock insight if data is sparse
    if (insights.length === 0) {
      insights.push({
        type: 'SYSTEM',
        severity: 'INFO',
        message: `Welcome to SalonOS. Your AI engine is currently analyzing your data. Check back in 24 hours for predictions.`
      });
    }

    return insights;
  } catch (error) {
    console.error('Failed to generate insights', error);
    return [];
  }
};
