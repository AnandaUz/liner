import dotenv from "dotenv";

dotenv.config({ path: new URL('../.env', import.meta.url) });

import { Telegraf } from "telegraf";


const bot = new Telegraf(process.env.BOT_LINER_TOKEN);

// Настройка вебхука


const grokUrl = '503dd10771c0'
const url = 'https://'+grokUrl+'.ngrok-free.app/api/bot_isee'

bot.telegram.setWebhook(url);