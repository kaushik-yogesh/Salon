import { prisma } from '../utils/db.js';
import { sendSuccess } from '../utils/response.util.js';
import { logActivity } from '../utils/logger.js';

export const sendCampaign = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { type, message, targetAudience } = req.body; // type: 'SMS' | 'EMAIL'

    // Simulate sending the campaign to all customers
    const customers = await prisma.customer.findMany({
      where: { tenantId }
    });

    const numSent = customers.length;

    // Log the campaign broadcast
    await prisma.notificationLog.create({
      data: {
        tenantId,
        type,
        recipient: targetAudience || 'ALL_CUSTOMERS',
        title: 'Marketing Campaign',
        message: message,
        status: 'SENT',
        sentAt: new Date()
      }
    });

    await logActivity({
      tenantId,
      actorId: req.user?.id,
      action: 'MARKETING_CAMPAIGN_SENT',
      resourceType: 'NotificationLog',
      resourceId: null,
      newValues: { type, audienceCount: numSent },
      ipAddress: req.ip
    });

    sendSuccess(res, { message: `Campaign successfully blasted to ${numSent} customers.` });
  } catch (error) {
    next(error);
  }
};
