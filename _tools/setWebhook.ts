import "../_base/server/config";

import { setWebhook2, Links } from "../_base/_tools/setWebhook.js";

const ngrokUrl = "b755-92-253-194-211";

const apiUrl = "/api/telegram/webhook";

// const ppServerBase = "https://liner-api-7097239392.asia-south2.run.app";
// const serverBase = "https://ishvara-api-7097239392.europe-west1.run.app";

const fullNgrokUrl = `https://${ngrokUrl}.ngrok-free.app`;
// есть два вида бота
//- клиентский бот
//-- дев
//-- прод
//- админский бот
//-- пока один

//+'?mode=meditation',
const links: Links = {
  "подключить клиент DEV к NGROK": {
    BOT_TOKEN: process.env.BOT_TOKEN || "",
    SERVER_URL: fullNgrokUrl,
    apiURL: apiUrl,
  },
};

setWebhook2("подключить клиент DEV к NGROK", links);
