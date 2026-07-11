import crypto from 'crypto';
import { prisma } from '../utils/db.js';
import { logActivity } from '../utils/logger.js';

export const inviteUser = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { email, roleId, branchIds } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, error: { message: 'User with this email already exists' } });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    const invitation = await prisma.invitation.create({
      data: {
        tenantId,
        email,
        roleId,
        branchIds,
        token,
        expiresAt
      }
    });

    await logActivity({
      tenantId,
      actorId: req.user.id,
      action: 'USER_INVITED',
      resourceType: 'Invitation',
      resourceId: invitation.id,
      newValues: { email, roleId, branchIds },
      ipAddress: req.ip
    });

    // In a real application, you would send an email here with the link:
    // https://frontend.com/accept-invite?token=token
    
    res.status(201).json({ success: true, data: { invitationId: invitation.id, token } });
  } catch (error) {
    next(error);
  }
};

export const getInvitations = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const invitations = await prisma.invitation.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, data: invitations });
  } catch (error) {
    next(error);
  }
};
