import { prisma } from '../utils/db.js';
import { sendSuccess } from '../utils/response.util.js';
import { NotFoundError } from '../utils/errors.util.js';
import { logActivity } from '../utils/logger.js';

export const getBranches = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;

    const branches = await prisma.branch.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    sendSuccess(res, branches);
  } catch (error) {
    next(error);
  }
};

export const getBranch = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;

    const branch = await prisma.branch.findUnique({
      where: { id, tenantId, deletedAt: null }
    });

    if (!branch) throw new NotFoundError('Branch not found');

    sendSuccess(res, branch);
  } catch (error) {
    next(error);
  }
};

export const createBranch = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { name, address, status } = req.body;

    const branch = await prisma.branch.create({
      data: {
        tenantId,
        name,
        address,
        status: status || 'ACTIVE'
      }
    });

    await logActivity({
      tenantId,
      actorId: req.user.id,
      action: 'BRANCH_CREATED',
      resourceType: 'Branch',
      resourceId: branch.id,
      ipAddress: req.ip
    });

    sendSuccess(res, branch, 201);
  } catch (error) {
    next(error);
  }
};

export const updateBranch = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const { name, address, status } = req.body;

    const existingBranch = await prisma.branch.findUnique({
      where: { id, tenantId, deletedAt: null }
    });

    if (!existingBranch) throw new NotFoundError('Branch not found');

    const updatedBranch = await prisma.branch.update({
      where: { id },
      data: { name, address, status }
    });

    await logActivity({
      tenantId,
      actorId: req.user.id,
      action: 'BRANCH_UPDATED',
      resourceType: 'Branch',
      resourceId: updatedBranch.id,
      ipAddress: req.ip
    });

    sendSuccess(res, updatedBranch);
  } catch (error) {
    next(error);
  }
};

export const deleteBranch = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;

    const existingBranch = await prisma.branch.findUnique({
      where: { id, tenantId, deletedAt: null }
    });

    if (!existingBranch) throw new NotFoundError('Branch not found');

    // Soft delete
    await prisma.branch.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'CLOSED' }
    });

    await logActivity({
      tenantId,
      actorId: req.user.id,
      action: 'BRANCH_DELETED',
      resourceType: 'Branch',
      resourceId: id,
      ipAddress: req.ip
    });

    sendSuccess(res, { message: 'Branch deleted successfully' });
  } catch (error) {
    next(error);
  }
};
