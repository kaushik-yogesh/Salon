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
    const { 
      name, 
      status,
      subscriptionTier,
      defaultCurrency, 
      defaultTimezone, 
      globalTaxRate, 
      businessHours,
      stripeSecretKey,
      stripeWebhookSecret,
      twilioAccountSid,
      twilioAuthToken,
      twilioPhoneNumber,
      logoUrl,
      primaryColor,
      invoiceFooterText,
      receiptMessage
    } = req.body;

    const existingTenant = await prisma.tenant.findUnique({ where: { id, deletedAt: null } });
    if (!existingTenant) throw new NotFoundError('Tenant not found');

    const updateData = {};
    if (name) updateData.name = name;
    if (status) updateData.status = status;
    if (subscriptionTier) updateData.subscriptionTier = subscriptionTier;
    if (defaultCurrency) updateData.defaultCurrency = defaultCurrency;
    if (defaultTimezone) updateData.defaultTimezone = defaultTimezone;
    if (globalTaxRate !== undefined) updateData.globalTaxRate = parseFloat(globalTaxRate);
    if (businessHours) updateData.businessHours = businessHours;
    
    // Integrations
    if (stripeSecretKey !== undefined) updateData.stripeSecretKey = stripeSecretKey;
    if (stripeWebhookSecret !== undefined) updateData.stripeWebhookSecret = stripeWebhookSecret;
    if (twilioAccountSid !== undefined) updateData.twilioAccountSid = twilioAccountSid;
    if (twilioAuthToken !== undefined) updateData.twilioAuthToken = twilioAuthToken;
    if (twilioPhoneNumber !== undefined) updateData.twilioPhoneNumber = twilioPhoneNumber;

    // Branding
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (invoiceFooterText !== undefined) updateData.invoiceFooterText = invoiceFooterText;
    if (receiptMessage !== undefined) updateData.receiptMessage = receiptMessage;

    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: updateData
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

export const upgradeSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tier } = req.body; // e.g., 'PRO', 'ENTERPRISE'

    const existingTenant = await prisma.tenant.findUnique({ where: { id, deletedAt: null } });
    if (!existingTenant) throw new NotFoundError('Tenant not found');

    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: { subscriptionTier: tier }
    });

    await logActivity({
      tenantId: id,
      actorId: req.user?.id,
      action: 'SUBSCRIPTION_UPGRADED',
      resourceType: 'Tenant',
      resourceId: id,
      newValues: { tier },
      ipAddress: req.ip
    });

    sendSuccess(res, { message: `Successfully upgraded to ${tier} plan!`, tenant: updatedTenant });
  } catch (error) {
    next(error);
  }
};

export const getWebhooks = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const webhooks = await prisma.webhook.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
    sendSuccess(res, webhooks);
  } catch (error) {
    next(error);
  }
};

export const createWebhook = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { url, event, secret } = req.body;
    
    const webhook = await prisma.webhook.create({
      data: { tenantId, url, event: event || 'ALL', secret }
    });

    sendSuccess(res, webhook, 201);
  } catch (error) {
    next(error);
  }
};

export const deleteWebhook = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;

    await prisma.webhook.delete({ where: { id, tenantId } });
    sendSuccess(res, { message: 'Webhook deleted' });
  } catch (error) {
    next(error);
  }
};
