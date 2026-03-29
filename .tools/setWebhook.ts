//npx tsx .tools/setWebhook.ts

import dotenv from "dotenv";

dotenv.config({ path: new URL('../.env', import.meta.url) });

import { Telegraf } from "telegraf";


const isForDev = true;

let bot;
bot = new Telegraf(process.env.BOT_TOKEN || '');
let url: string;

const apiUrl = '/api/telegram/webhook';

if (isForDev) {
    

//для дев версии
    const grokUrl = 'efbc-92-253-195-238'
    url = 'https://'+grokUrl+'.ngrok-free.app'+apiUrl
    console.log(`установил веб хук для ДЕВ бота \n ${url}`)

} else {


//для прод версии
    url = process.env.API_URL+apiUrl    
    console.log(`установил веб хук для ОСНОВНОГО бота 
 ${url}`)
    
}
bot.telegram.setWebhook(url);




