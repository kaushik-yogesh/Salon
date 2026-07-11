import { prisma } from '../utils/db.js';
import { logActivity } from '../utils/logger.js';

export const getCatalog = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    
    // Fetch categories with nested services and variations
    const categories = await prisma.serviceCategory.findMany({
      where: { tenantId, status: 'ACTIVE' },
      include: {
        services: {
          where: { status: 'ACTIVE' },
          include: { variations: true }
        }
      },
      orderBy: { displayOrder: 'asc' }
    });

    const packages = await prisma.package.findMany({
      where: { tenantId, status: 'ACTIVE' },
      include: {
        services: { include: { service: true } }
      }
    });

    res.status(200).json({ success: true, data: { categories, packages } });
  } catch (error) {
    next(error);
  }
};

export const createService = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { categoryId, name, description, basePrice, baseDuration, taxRate, variations } = req.body;

    const service = await prisma.service.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name
        }
      },
      update: {
        categoryId,
        description,
        basePrice,
        baseDuration,
        taxRate,
      },
      create: {
        tenantId,
        categoryId,
        name,
        description,
        basePrice,
        baseDuration,
        taxRate,
        variations: {
          create: variations || []
        }
      },
      include: { variations: true }
    });

    await logActivity({
      tenantId,
      actorId: req.user.id,
      action: 'SERVICE_CREATED_OR_UPDATED',
      resourceType: 'Service',
      resourceId: service.id,
      newValues: { name, basePrice },
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, data: service });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { name, description } = req.body;

    const category = await prisma.serviceCategory.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name
        }
      },
      update: {
        description
      },
      create: {
        tenantId,
        name,
        description
      }
    });

    await logActivity({
      tenantId,
      actorId: req.user.id,
      action: 'CATEGORY_CREATED_OR_UPDATED',
      resourceType: 'ServiceCategory',
      resourceId: category.id,
      newValues: { name },
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};
