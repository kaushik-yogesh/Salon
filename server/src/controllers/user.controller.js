import { prisma } from '../utils/db.js';
import { sendSuccess } from '../utils/response.util.js';
import { NotFoundError } from '../utils/errors.util.js';
import { logActivity } from '../utils/logger.js';

export const getUsers = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { status, roleId, search } = req.query;

    const where = {
      tenantId,
      deletedAt: null,
      ...(status && { status }),
      ...(roleId && { userRoles: { some: { roleId } } }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { profile: { firstName: { contains: search, mode: 'insensitive' } } },
          { profile: { lastName: { contains: search, mode: 'insensitive' } } }
        ]
      })
    };

    const users = await prisma.user.findMany({
      where,
      include: {
        profile: true,
        userRoles: { include: { role: true } },
        branches: { include: { branch: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    sendSuccess(res, users);
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const { status } = req.body;

    const oldUser = await prisma.user.findUnique({ where: { id, tenantId, deletedAt: null } });
    if (!oldUser) {
      throw new NotFoundError('User not found');
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status }
    });

    await logActivity({
      tenantId,
      actorId: req.user.id,
      action: 'USER_STATUS_UPDATED',
      resourceType: 'User',
      resourceId: id,
      oldValues: { status: oldUser.status },
      newValues: { status: updatedUser.status },
      ipAddress: req.ip
    });

    sendSuccess(res, updatedUser);
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id, tenantId, deletedAt: null },
      include: {
        profile: true,
        userRoles: { include: { role: true } },
        branches: { include: { branch: true } }
      }
    });

    if (!user) throw new NotFoundError('User not found');
    
    // Remove password hash from response
    delete user.passwordHash;
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
};

export const updateUserProfile = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const { firstName, lastName, phone, photoUrl, emergencyContact, skills } = req.body;

    const user = await prisma.user.findUnique({ where: { id, tenantId, deletedAt: null } });
    if (!user) throw new NotFoundError('User not found');

    const updatedProfile = await prisma.userProfile.upsert({
      where: { userId: id },
      update: { firstName, lastName, phone, photoUrl, emergencyContact, skills },
      create: { userId: id, firstName, lastName, phone, photoUrl, emergencyContact, skills }
    });

    await logActivity({
      tenantId,
      actorId: req.user.id,
      action: 'USER_PROFILE_UPDATED',
      resourceType: 'UserProfile',
      resourceId: updatedProfile.id,
      ipAddress: req.ip
    });

    sendSuccess(res, updatedProfile);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id, tenantId, deletedAt: null } });
    if (!user) throw new NotFoundError('User not found');

    // Soft delete
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'SUSPENDED' }
    });

    await logActivity({
      tenantId,
      actorId: req.user.id,
      action: 'USER_DELETED',
      resourceType: 'User',
      resourceId: id,
      ipAddress: req.ip
    });

    sendSuccess(res, { message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};
