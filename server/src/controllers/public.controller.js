import { prisma } from '../utils/db.js';
import { sendBookingConfirmation } from '../utils/notification.service.js';
import { validateWorkerAvailability } from '../services/appointment.service.js';

export const getPublicSalons = async (req, res, next) => {
  try {
    const salons = await prisma.tenant.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        branches: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      }
    });

    const formattedSalons = salons.map(salon => ({
      id: salon.id,
      name: salon.name,
      rating: 4.8, // Mock rating for now
      type: 'Salon',
      location: salon.branches[0]?.address || 'Multiple Locations',
      branches: salon.branches
    }));

    res.status(200).json({ success: true, data: formattedSalons });
  } catch (error) {
    next(error);
  }
};

export const getPublicCatalog = async (req, res, next) => {
  try {
    const { tenantId } = req.params;

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId, status: 'ACTIVE' } });
    if (!tenant) return res.status(404).json({ success: false, error: { message: 'Tenant not found or inactive' } });

    let categories = await prisma.serviceCategory.findMany({
      where: { tenantId, status: 'ACTIVE' },
      include: {
        services: {
          where: { status: 'ACTIVE' }
        }
      },
      orderBy: { displayOrder: 'asc' }
    });

    const hasVisibleServices = categories.some(category => category.services?.length > 0);
    const existingServices = await prisma.service.count({ where: { tenantId, status: 'ACTIVE' } });

    if (!hasVisibleServices && existingServices === 0) {
      const fallbackCategory = await prisma.serviceCategory.create({
        data: {
          tenantId,
          name: 'General Services',
          description: 'Default services for booking',
          status: 'ACTIVE'
        }
      });

      const fallbackService = await prisma.service.create({
        data: {
          tenantId,
          categoryId: fallbackCategory.id,
          name: 'Standard Service',
          basePrice: 50,
          baseDuration: 60,
          status: 'ACTIVE'
        }
      });

      categories = [{
        id: fallbackCategory.id,
        tenantId,
        name: fallbackCategory.name,
        description: fallbackCategory.description,
        color: fallbackCategory.color,
        displayOrder: fallbackCategory.displayOrder,
        status: fallbackCategory.status,
        createdAt: fallbackCategory.createdAt,
        updatedAt: fallbackCategory.updatedAt,
        services: [fallbackService]
      }];
    }

    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

export const getPublicWorkers = async (req, res, next) => {
  try {
    const { tenantId } = req.params;

    const workers = await prisma.workerProfile.findMany({
      where: { tenantId, isActive: true },
      include: {
        user: { select: { profile: true } }
      }
    });

    res.status(200).json({ success: true, data: workers });
  } catch (error) {
    next(error);
  }
};

export const createGuestBooking = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { branchId, serviceId, workerProfileId, date, startTime, firstName, lastName, email, phone } = req.body;

    // 1. Find or Create Customer
    let customer = await prisma.customer.findFirst({
      where: { tenantId, email }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: { tenantId, firstName, lastName, email, phone }
      });
    }

    // 2. Fetch Service details to calculate duration/price
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return res.status(404).json({ success: false, error: { message: 'Service not found' } });

    const start = new Date(`${date}T${startTime}:00Z`);
    const end = new Date(start.getTime() + service.baseDuration * 60000);

    // Validate worker availability & conflicts
    await validateWorkerAvailability(tenantId, branchId, workerProfileId, start, end);

    // 3. Create the Booking Transaction
    const appointment = await prisma.appointment.create({
      data: {
        tenantId,
        branchId,
        customerId: customer.id,
        date: new Date(date),
        totalPrice: service.basePrice,
        totalDuration: service.baseDuration,
        status: 'PENDING',
        services: {
          create: [{
            serviceId: service.id,
            workerProfileId: workerProfileId,
            startTime: start,
            endTime: end,
            price: service.basePrice
          }]
        }
      },
      include: { services: true }
    });

    // Send confirmation email asynchronously (fire and forget)
    sendBookingConfirmation(appointment.id).catch(console.error);

    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
};
