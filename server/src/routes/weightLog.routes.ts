import { Router } from 'express';
import { getWeightLogByUserId } from '../controllers/weightLog.controller';

const router = Router();

router.get('/:id', getWeightLogByUserId);

export default router;