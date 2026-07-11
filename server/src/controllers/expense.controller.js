import { prisma } from '../utils/db.js';
import { sendSuccess } from '../utils/response.util.js';
import { NotFoundError } from '../utils/errors.util.js';
import { logActivity } from '../utils/logger.js';

export const createExpense = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { branchId, category, amount, date, description, receiptUrl } = req.body;

    const expense = await prisma.expense.create({
      data: {
        tenantId,
        branchId,
        category,
        amount,
        date: new Date(date),
        description,
        receiptUrl,
        status: 'APPROVED' // Default to approved unless a workflow dictates otherwise
      }
    });

    await logActivity({
      tenantId,
      actorId: req.user.id,
      action: 'EXPENSE_CREATED',
      resourceType: 'Expense',
      resourceId: expense.id,
      ipAddress: req.ip
    });

    sendSuccess(res, expense, 201);
  } catch (error) {
    next(error);
  }
};

export const getExpenses = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { startDate, endDate, category, branchId } = req.query;

    const where = { tenantId };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    if (category) where.category = category;
    if (branchId) where.branchId = branchId;

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { branch: true }
    });

    sendSuccess(res, expenses);
  } catch (error) {
    next(error);
  }
};

export const updateExpenseStatus = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const { status } = req.body;

    const expense = await prisma.expense.findUnique({
      where: { id, tenantId }
    });

    if (!expense) throw new NotFoundError('Expense not found');

    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: { status }
    });

    await logActivity({
      tenantId,
      actorId: req.user.id,
      action: 'EXPENSE_STATUS_UPDATED',
      resourceType: 'Expense',
      resourceId: expense.id,
      newValues: { status },
      ipAddress: req.ip
    });

    sendSuccess(res, updatedExpense);
  } catch (error) {
    next(error);
  }
};
