import { prisma } from '../utils/db.js';
import { sendSuccess } from '../utils/response.util.js';

export const getSalons = async (req, res, next) => {
  try {
    const salons = await prisma.tenant.findMany({
      where: {
        setupComplete: true,
      },
      select: {
        id: true,
        name: true,
        branches: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        _count: {
          select: {
            Service: true,
            WorkerProfile: true
          }
        }
      },
      take: 50
    });
    sendSuccess(res, { salons });
  } catch (error) {
    next(error);
  }
};

export const getSalonCatalog = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
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
    
    // Fetch workers for this tenant to choose from
    const workers = await prisma.workerProfile.findMany({
      where: { user: { tenantId }, status: 'ACTIVE' },
      include: {
        user: {
          include: { profile: true }
        }
      }
    });

    sendSuccess(res, { categories, workers });
  } catch (error) {
    next(error);
  }
};
