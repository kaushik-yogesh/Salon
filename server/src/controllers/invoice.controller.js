import { prisma } from '../utils/db.js';
import { sendSuccess } from '../utils/response.util.js';

export const getAllInvoices = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { status, limit = 50 } = req.query;

    const where = { tenantId };
    if (status) where.status = status;

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      include: {
        lineItems: true,
        payments: true,
        customer: true,
        branch: { select: { name: true } }
      }
    });

    sendSuccess(res, invoices);
  } catch (error) {
    next(error);
  }
};
