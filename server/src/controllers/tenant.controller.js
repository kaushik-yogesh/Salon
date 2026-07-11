import { prisma } from '../utils/db.js';
import { sendSuccess } from '../utils/response.util.js';
import { NotFoundError } from '../utils/errors.util.js';
import { logActivity } from '../utils/logger.js';

export const getTenants = async (req, res, next) => {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
    sendSuccess(res, tenants);
  } catch (error) {
    next(error);
  }
};

export const getTenant = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // If you're a regular user, you should only fetch your own tenant
    if (req.tenant && req.tenant.id !== id) {
      // Assuming a super admin could access any tenant, but a normal user cannot.
      // The RBAC middleware will block non-super-admins from hitting this for different tenants if implemented correctly,
      // but enforcing it at the controller level is safer.
      const isSuperAdmin = req.user?.userRoles?.some(ur => ur.role.name === 'SUPER_ADMIN');
      if (!isSuperAdmin) throw new NotFoundError('Tenant not found');
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id, deletedAt: null },
      include: {
        branches: {
          where: { deletedAt: null }
        }
      }
    });

    if (!tenant) throw new NotFoundError('Tenant not found');
    sendSuccess(res, tenant);
  } catch (error) {
    next(error);
  }
};

export const createTenant = async (req, res, next) => {
  try {
    const { name, subscriptionTier, defaultCurrency, defaultTimezone } = req.body;

    const tenant = await prisma.tenant.create({
      data: {
        name,
        subscriptionTier,
        defaultCurrency,
        defaultTimezone
      }
    });

    await logActivity({
      tenantId: tenant.id,
      actorId: req.user?.id,
      action: 'TENANT_CREATED',
      resourceType: 'Tenant',
      resourceId: tenant.id,
      ipAddress: req.ip
    });

    sendSuccess(res, tenant, 201);
  } catch (error) {
    next(error);
  }
};

export const updateTenant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, status, subscriptionTier, defaultCurrency, defaultTimezone } = req.body;

    const existingTenant = await prisma.tenant.findUnique({ where: { id, deletedAt: null } });
    if (!existingTenant) throw new NotFoundError('Tenant not found');

    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: { name, status, subscriptionTier, defaultCurrency, defaultTimezone }
    });

    await logActivity({
      tenantId: updatedTenant.id,
      actorId: req.user?.id,
      action: 'TENANT_UPDATED',
      resourceType: 'Tenant',
      resourceId: updatedTenant.id,
      ipAddress: req.ip
    });

    sendSuccess(res, updatedTenant);
  } catch (error) {
    next(error);
  }
};

export const deleteTenant = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingTenant = await prisma.tenant.findUnique({ where: { id, deletedAt: null } });
    if (!existingTenant) throw new NotFoundError('Tenant not found');

    await prisma.tenant.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'SUSPENDED' }
    });

    await logActivity({
      tenantId: id,
      actorId: req.user?.id,
      action: 'TENANT_DELETED',
      resourceType: 'Tenant',
      resourceId: id,
      ipAddress: req.ip
    });

    sendSuccess(res, { message: 'Tenant deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const markSetupComplete = async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id || req.params.id;

    const existingTenant = await prisma.tenant.findUnique({ where: { id: tenantId, deletedAt: null } });
    if (!existingTenant) throw new NotFoundError('Tenant not found');

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { setupComplete: true }
    });

    await logActivity({
      tenantId,
      actorId: req.user?.id,
      action: 'SETUP_COMPLETED',
      resourceType: 'Tenant',
      resourceId: tenantId,
      ipAddress: req.ip
    });

    sendSuccess(res, updatedTenant);
  } catch (error) {
    next(error);
  }
};
