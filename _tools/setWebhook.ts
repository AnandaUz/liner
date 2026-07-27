import "../_base/server/config";

import { setWebhook3 } from "../_base/_tools/setWebhook.js";

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
