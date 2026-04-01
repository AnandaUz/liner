import { Router } from 'express';
import { getTelegramLink } from '../controllers/telegram.controller.js';

const router = Router();

router.get('/link', getTelegramLink);

export default router;