import express from 'express';
import { getSalons, getSalonCatalog } from '../controllers/directory.controller.js';

const router = express.Router();

router.get('/salons', getSalons);
router.get('/catalog/:tenantId', getSalonCatalog);

export default router;
