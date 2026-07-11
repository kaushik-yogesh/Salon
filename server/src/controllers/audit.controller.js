import { prisma } from '../utils/db.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { resourceType, limit = 50 } = req.query;

    const logs = await prisma.auditLog.findMany({
      where: {
        tenantId,
        ...(resourceType && { resourceType })
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10)
    });

    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};
