import { Router } from 'express';
import { getTelegramLink } from '../controllers/telegram.controller.js';
import { doReminder } from '../bot.js';

const router = Router();

router.get('/link', getTelegramLink);

router.get('/reminde', doReminder);

export default router;