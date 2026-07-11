import express from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import * as customerController from '../controllers/customer.controller.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', requirePermission('CUSTOMERS', 'READ'), customerController.getCustomers);
router.get('/:id', requirePermission('CUSTOMERS', 'READ'), customerController.getCustomerById);
router.post('/', requirePermission('CUSTOMERS', 'CREATE'), customerController.createCustomer);
router.put('/:id', requirePermission('CUSTOMERS', 'UPDATE'), customerController.updateCustomer);
router.delete('/:id', requirePermission('CUSTOMERS', 'DELETE'), customerController.deleteCustomer);

export default router;
