import 'dotenv/config';
import { Request, Response } from 'express';
import { connectDB } from './db.js';

import bot, { doReminder } from './bot.js';

// Обработчик вебхука для Express / Vercel
export default async function handler(req: Request, res: Response) {
    console.log('[TEMP_LOG] Webhook handler hit:', {
        method: req.method,
        path: req.path,
        originalUrl: req.originalUrl,
        query: req.query,
        body: req.body ? 'has body' : 'no body'
    });
    try {
        await connectDB();

        // Проверяем, не является ли это командой для напоминания (например, через Cron Job)
        // URL вида: /api/reminder или /api/webhook?task=reminder
        if ((req.query && req.query.task === 'reminder') || req.path === '/reminder' || req.originalUrl === '/api/reminder') {
            console.log('[TEMP_LOG] Path matched as reminder task');
            await doReminder();
            res.status(200).send('Reminder sent');
            return;
        }

        console.log('[TEMP_LOG] Passing update to bot.handleUpdate');
        await (bot as any).handleUpdate(req.body, res);
        if (!res.writableEnded) {
            res.sendStatus(200);
        }
    } catch (err) {
        console.error('Error handling update:', err);
        res.sendStatus(500);
    }
}