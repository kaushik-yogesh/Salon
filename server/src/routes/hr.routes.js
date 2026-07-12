import express from 'express';
import { 
  getWorkers, createWorkerProfile, updateWorkerProfile, deleteWorkerProfile, 
  updateWorkerSchedule, requestTimeOff, updateTimeOffStatus, getTimeOffRequests,
  getShifts,
  saveShifts,
  clockInOut,
  getWorkerDocuments,
  addWorkerDocument
} from '../controllers/hr.controller.js';
import { requireAuth, requireTenantContext } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { 
  createWorkerProfileSchema, updateWorkerProfileSchema, updateScheduleSchema, 
  timeOffRequestSchema, timeOffStatusSchema, workerIdSchema 
} from '../validators/hr.validators.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenantContext);

router.get('/', requirePermission('HR', 'READ'), getWorkers);
router.post('/', requirePermission('HR', 'CREATE'), validate(createWorkerProfileSchema), createWorkerProfile);

router.put('/:id', requirePermission('HR', 'UPDATE'), validate(updateWorkerProfileSchema), updateWorkerProfile);
router.delete('/:id', requirePermission('HR', 'DELETE'), validate(workerIdSchema), deleteWorkerProfile);

router.put('/:id/schedules', requirePermission('HR', 'UPDATE'), validate(updateScheduleSchema), updateWorkerSchedule);

router.get('/:id/time-off', requireAuth, getTimeOffRequests);
router.post('/:id/time-off', requirePermission('HR', 'UPDATE'), validate(timeOffRequestSchema), requestTimeOff);
router.put('/time-off/:requestId/status', requirePermission('HR', 'UPDATE'), validate(timeOffStatusSchema), updateTimeOffStatus);

router.get('/shifts', requirePermission('HR', 'READ'), getShifts);
router.post('/shifts', requirePermission('HR', 'UPDATE'), saveShifts);
router.post('/attendance/clock', requirePermission('HR', 'UPDATE'), clockInOut);

router.get('/workers/:id/documents', requirePermission('HR', 'READ'), getWorkerDocuments);
router.post('/workers/:id/documents', requirePermission('HR', 'UPDATE'), addWorkerDocument);

export default router;
