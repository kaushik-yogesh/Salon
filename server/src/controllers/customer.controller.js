import { prisma } from '../utils/db.js';
import { sendSuccess } from '../utils/response.util.js';
import { NotFoundError, AppError } from '../utils/errors.util.js';

export const getCustomers = async (req, res, next) => {
  try {
    const { tenantId } = req.user; // Set by auth middleware
    const { search, skip = 0, take = 50 } = req.query;

    const whereClause = {
      tenantId,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ]
      })
    };

    const customers = await prisma.customer.findMany({
      where: whereClause,
      skip: parseInt(skip),
      take: parseInt(take),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { appointments: true }
        }
      }
    });

    const total = await prisma.customer.count({ where: whereClause });

    sendSuccess(res, { customers, total, skip, take });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;

    const customer = await prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        appointments: {
          orderBy: { date: 'desc' },
          take: 10,
          include: {
            services: {
              include: { service: true }
            }
          }
        },
        Invoice: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            lineItems: true
          }
        }
      }
    });

    if (!customer) throw new NotFoundError('Customer not found');

    sendSuccess(res, { customer });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { firstName, lastName, email, phone, notes, tags } = req.body;

    // Check if email already exists for this tenant
    if (email) {
      const existing = await prisma.customer.findFirst({ where: { tenantId, email } });
      if (existing) throw new AppError('A customer with this email already exists', 400);
    }

    const customer = await prisma.customer.create({
      data: {
        tenantId,
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        notes: notes || null,
        tags: tags || []
      }
    });

    sendSuccess(res, { customer }, 201);
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    const { firstName, lastName, email, phone, notes, tags } = req.body;

    const customer = await prisma.customer.findFirst({ where: { id, tenantId } });
    if (!customer) throw new NotFoundError('Customer not found');

    if (email && email !== customer.email) {
      const existing = await prisma.customer.findFirst({ where: { tenantId, email } });
      if (existing) throw new AppError('A customer with this email already exists', 400);
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: { firstName, lastName, email, phone, notes, tags }
    });

    sendSuccess(res, { customer: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;

    const customer = await prisma.customer.findFirst({ where: { id, tenantId } });
    if (!customer) throw new NotFoundError('Customer not found');

    // Soft delete not supported by schema directly on customer, so hard delete or handle via logic
    // We will hard delete for MVP
    await prisma.customer.delete({ where: { id } });

    sendSuccess(res, { message: 'Customer deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const importCustomers = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { customers } = req.body; // Array of { firstName, lastName, email, phone, notes }

    if (!Array.isArray(customers) || customers.length === 0) {
      throw new AppError('No customers provided for import', 400);
    }

    // Filter out invalid records
    const validCustomers = customers.filter(c => c.firstName);

    if (validCustomers.length === 0) {
      throw new AppError('No valid customers found in import data', 400);
    }

    const dataToInsert = validCustomers.map(c => ({
      tenantId,
      firstName: String(c.firstName).trim(),
      lastName: c.lastName ? String(c.lastName).trim() : '',
      email: c.email ? String(c.email).trim().toLowerCase() : null,
      phone: c.phone ? String(c.phone).trim() : null,
      notes: c.notes ? String(c.notes).trim() : null,
      tags: []
    }));

    // Create many (Note: Prisma createMany on PostgreSQL might fail if there are unique constraint violations like email, 
    // but the schema says email is NOT unique across the whole table, it's unique by [tenantId, email].
    // Prisma createMany skipDuplicates is supported on Postgres)
    const result = await prisma.customer.createMany({
      data: dataToInsert,
      skipDuplicates: true
    });

    sendSuccess(res, { 
      message: `Successfully imported ${result.count} customers`,
      count: result.count
    }, 201);
  } catch (error) {
    next(error);
  }
};
