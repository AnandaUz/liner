import 'dotenv/config';

import { connectDB } from './db.mjs';

import bot, { doReminder } from './bot.mjs';

// Обработчик вебхука для Express / Vercel
export default async function handler(req, res) {
    // console.log('Webhook received:', JSON.stringify(req.body, null, 2));
    try {
        await connectDB();

        // Проверяем, не является ли это командой для напоминания (например, через Cron Job)
        // URL вида: /api/webhook?task=reminder
        if (req.query && req.query.task === 'reminder') {
            await doReminder();
            res.status(200).send('Reminder sent');
            return;
        }

        await bot.handleUpdate(req.body, res);
        if (!res.writableEnded) {
            res.sendStatus(200);
        }
    } catch (err) {
        console.error('Error handling update:', err);
        res.sendStatus(500);
    }
}