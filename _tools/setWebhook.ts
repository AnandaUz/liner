import "../server/src/config.js";
import { Telegraf } from "telegraf";

export interface WebhookConfig {
  BOT_TOKEN: string;
  SERVER_URL: string;
  apiURL: string;
  name?: string;
}

export async function setWebhook3(config: WebhookConfig) {
  const bot_token = config.BOT_TOKEN;
  const url = config.SERVER_URL;
  const apiUrl = config.apiURL;
  const resultStr = `✅ ${config.name || ""}`;

  try {
    const bot = new Telegraf(bot_token);
    const result = await bot.telegram.setWebhook(url + apiUrl);
    console.log(resultStr);
    console.log(url + apiUrl);
    console.log(result);
  } catch (e) {
    console.error("Ошибка при настройке бота:", e);
  }
}

const ngrokUrl = "7d2b-92-253-194-211";

const apiUrl = "/api/telegram/webhook";

// const ppServerBase = "https://liner-api-7097239392.asia-south2.run.app";
// const serverBase = "https://ishvara-api-7097239392.europe-west1.run.app";

const fullNgrokUrl = `https://${ngrokUrl}.ngrok-free.app`;

setWebhook3({
  name: "подключить клиент DEV к NGROK",
  BOT_TOKEN: process.env.BOT_TOKEN || "",
  SERVER_URL: fullNgrokUrl,
  apiURL: apiUrl,
});
