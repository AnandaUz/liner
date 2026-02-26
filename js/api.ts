import 'dotenv/config';
import { Request, Response } from 'express';
import { connectDB } from './db.js';

import bot, { doReminder } from './bot.js';

// Обработчик вебхука для Express / Vercel
export default async function handler(req: Request, res: Response) {
    // console.log('Webhook received:', JSON.stringify(req.body, null, 2));
    try {
        await connectDB();

        // Проверяем, не является ли это командой для напоминания (например, через Cron Job)
        // URL вида: /api/reminder или /api/webhook?task=reminder
        if ((req.query && req.query.task === 'reminder') || req.path === '/reminder' || req.originalUrl === '/api/reminder') {
            await doReminder();
            res.status(200).send('Reminder sent');
            return;
        }

        await (bot as any).handleUpdate(req.body, res);
        if (!res.writableEnded) {
            res.sendStatus(200);
        }
    } catch (err) {
        console.error('Error handling update:', err);
        res.sendStatus(500);
    }
}