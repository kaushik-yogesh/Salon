import { prisma } from '../utils/db.js';
import { sendSuccess } from '../utils/response.util.js';
import { NotFoundError } from '../utils/errors.util.js';
import { logActivity } from '../utils/logger.js';

export const getInventory = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { branchId } = req.query;

    const products = await prisma.product.findMany({
      where: {
        tenantId,
        ...(branchId && { branchId })
      },
      orderBy: { name: 'asc' }
    });

    sendSuccess(res, products);
  } catch (error) {
    next(error);
  }
};

export const adjustStock = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { productId, type, quantity, notes } = req.body;

    const product = await prisma.product.findUnique({ where: { id: productId, tenantId } });
    if (!product) throw new NotFoundError('Product not found');

    // Use a transaction to ensure stock is updated correctly
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.inventoryTransaction.create({
        data: { productId, type, quantity, notes }
      });

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { stockQuantity: { increment: quantity } }
      });

      return { transaction, updatedProduct };
    });

    await logActivity({
      tenantId,
      actorId: req.user.id,
      action: 'INVENTORY_ADJUSTED',
      resourceType: 'Product',
      resourceId: product.id,
      newValues: { oldStock: product.stockQuantity, newStock: result.updatedProduct.stockQuantity, type },
      ipAddress: req.ip
    });

    sendSuccess(res, result.updatedProduct);
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { branchId, sku, name, description, retailPrice, costPrice, stockQuantity, lowStockThreshold, status } = req.body;

    const existingProduct = await prisma.product.findUnique({
      where: { tenantId_sku: { tenantId, sku } }
    });

    if (existingProduct) {
      throw new Error(`Product with SKU ${sku} already exists`);
    }

    const newProduct = await prisma.product.create({
      data: {
        tenantId,
        branchId,
        sku,
        name,
        description,
        retailPrice,
        costPrice,
        stockQuantity,
        lowStockThreshold,
        status
      }
    });

    if (stockQuantity > 0) {
      await prisma.inventoryTransaction.create({
        data: {
          productId: newProduct.id,
          type: 'RESTOCK',
          quantity: stockQuantity,
          notes: 'Initial Stock'
        }
      });
    }

    await logActivity({
      tenantId,
      actorId: req.user.id,
      action: 'PRODUCT_CREATED',
      resourceType: 'Product',
      resourceId: newProduct.id,
      ipAddress: req.ip
    });

    sendSuccess(res, newProduct, 201);
  } catch (error) {
    next(error);
  }
};

export const getSuppliers = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const suppliers = await prisma.supplier.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' }
    });
    sendSuccess(res, suppliers);
  } catch (error) {
    next(error);
  }
};

export const createSupplier = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { name, contactPerson, email, phone, address } = req.body;

    const supplier = await prisma.supplier.create({
      data: { tenantId, name, contactPerson, email, phone, address }
    });

    sendSuccess(res, supplier, 201);
  } catch (error) {
    next(error);
  }
};
