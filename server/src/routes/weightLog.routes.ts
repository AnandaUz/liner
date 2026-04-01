import { Router } from 'express';
import { getWeightLogByUserId } from '../controllers/weightLog.controller.js';

const router = Router();

router.get('/:id', getWeightLogByUserId);

export default router;