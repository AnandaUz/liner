import dotenv from "dotenv";

dotenv.config({ path: new URL('../.env', import.meta.url) });

import { Telegraf } from "telegraf";


const isForDev = true;


if (isForDev) {
    const bot = new Telegraf(process.env.BOT_LINER_TOKEN_DEV);

//для дев версии
    const grokUrl = '7ca1-92-253-192-234'
    const url = 'https://'+grokUrl+'.ngrok-free.app/api'

    bot.telegram.setWebhook(url);
} else {
    const bot = new Telegraf(process.env.BOT_LINER_TOKEN);

//для прод версии
    const url = 'https://linerapp.vercel.app/api'

    bot.telegram.setWebhook(url);
}



