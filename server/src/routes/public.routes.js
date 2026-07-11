import express from 'express';
import { getPublicSalons, getPublicCatalog, getPublicWorkers, createGuestBooking } from '../controllers/public.controller.js';

const router = express.Router();

// No Auth or Tenant Middlewares here - these are public B2C routes
// Tenant ID is passed via URL params

router.get('/salons', getPublicSalons);
router.get('/:tenantId/catalog', getPublicCatalog);
router.get('/:tenantId/workers', getPublicWorkers);
router.post('/:tenantId/book', createGuestBooking);

export default router;
