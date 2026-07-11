import { prisma } from '../utils/db.js';
import { generateInsights } from '../utils/ai.service.js';

export const getDashboardMetrics = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { branchId } = req.query;

    const whereBase = {
      tenantId,
      ...(branchId && { branchId })
    };

    // Aggregate Revenue
    const revenueAggregation = await prisma.invoice.aggregate({
      _sum: { grandTotal: true },
      where: {
        ...whereBase,
        status: 'PAID'
      }
    });

    // Aggregate Appointments for Today
    let today = new Date();
    if (req.query.date) {
      today = new Date(req.query.date);
      today.setUTCHours(0, 0, 0, 0); // req.query.date is YYYY-MM-DD
    } else {
      today.setHours(0, 0, 0, 0);
    }
    
    const appointmentsToday = await prisma.appointment.count({
      where: {
        ...whereBase,
        date: today
      }
    });

    // Aggregate Active Workers
    const activeWorkers = await prisma.workerProfile.count({
      where: {
        tenantId,
        isActive: true
      }
    });

    // Aggregate Low Stock Products
    const products = await prisma.product.findMany({
      where: whereBase,
      select: { stockQuantity: true, lowStockThreshold: true }
    });
    const lowStockCount = products.filter(p => p.stockQuantity <= p.lowStockThreshold).length;

    // Fetch Recent Activity (Last 5 Payments/Invoices)
    const recentActivity = await prisma.invoice.findMany({
      where: whereBase,
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, grandTotal: true, status: true, createdAt: true }
    });

    // Generate AI Insights
    const aiInsights = await generateInsights(tenantId, branchId);

    res.status(200).json({
      success: true,
      data: {
        revenue: revenueAggregation._sum.grandTotal || 0,
        appointmentsToday,
        activeWorkers,
        lowStockCount,
        recentActivity,
        aiInsights
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminDashboardMetrics = async (req, res, next) => {
  try {
    // Requires SUPER_ADMIN role (handled by middleware)
    const totalTenants = await prisma.tenant.count();
    const totalUsers = await prisma.user.count();
    
    // Revenue across entire platform
    const platformRevenue = await prisma.invoice.aggregate({
      _sum: { grandTotal: true },
      where: { status: 'PAID' }
    });

    const recentTenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, createdAt: true, status: true, subscriptionTier: true }
    });

    res.status(200).json({
      success: true,
      data: {
        totalTenants,
        totalUsers,
        platformRevenue: platformRevenue._sum.grandTotal || 0,
        recentTenants
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getSystemHealth = async (req, res, next) => {
  try {
    const configStatus = {
      smtp: !!process.env.SMTP_HOST,
      twilio: !!(process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN),
      stripe: !!process.env.STRIPE_SECRET_KEY,
      razorpay: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
      vapid: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
    };

    res.status(200).json({
      success: true,
      data: configStatus
    });
  } catch (error) {
    next(error);
  }
};
