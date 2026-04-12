import '../_base/server/config';
import { setWebhook2, Links } from "../_base/.tools/setWebhook";

const ngrokUrl = '5e37-92-253-192-234'

const apiUrl = '/api/telegram/webhook'


const ppServerBase = 'https://liner-api-7097239392.asia-south2.run.app'
const serverBase =   'https://liner-api-7097239392.asia-south2.run.app'

const fullNgrokUrl = `https://${ngrokUrl}.ngrok-free.app`
// есть два вида бота
//- клиентский бот
//-- дев
//-- прод
//- админский бот
//-- пока один
const links:Links = {
    'подключить клиент бот (прод) к Апи':{
        BOT_TOKEN:process.env.PROD_BOT_TOKEN || '',
        SERVER_URL:serverBase,
        apiURL:apiUrl,
    },
    'подключить клиент бот (дев) к ппАпи':{
        BOT_TOKEN:process.env.BOT_TOKEN || '',
        SERVER_URL:ppServerBase,
        apiURL:apiUrl,
    },
    'подключить клиент бот (дев) к ngrok':{
        BOT_TOKEN:process.env.BOT_TOKEN || '',
        SERVER_URL:fullNgrokUrl,
        apiURL:apiUrl,
    },
}   

//подключение к ПП
// setWebhook2('подключить клиент бот (дев) к ппАпи',links);
// setWebhook2('подключить админ бот к ппАпи',links);
//к ngrok
setWebhook2('подключить клиент бот (дев) к ngrok',links);


//подключение продакшена
// setWebhook2('подключить клиент бот (прод) к Апи',links);
// setWebhook2('подключить админ бот к Апи',links);


