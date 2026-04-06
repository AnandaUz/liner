import { setWebhook, WebhookConfig } from "@base/shared/.tools/setWebhook";

const webhookConfig: WebhookConfig = {
    mode: 'local',
    // mode: 'preprod',
    // mode: 'prod',
    ngrokUrl: 'a41b-92-253-192-234',
    apiUrl: '/api/telegram/webhook',
    prod: {
        BOT_TOKEN: '8112562344:AAG6zxep8WyHBa3udr5Bs4hLXE2OStrumnE',
        API_URL: 'https://api.liner.uz'
    },
    preprod: {
        BOT_TOKEN: '8583411735:AAFRPi__ho5UOSAlUvL3ak4PH6_osyYxR38',
        API_URL: 'https://preprod.liner.uz'
    }
}
setWebhook(webhookConfig);