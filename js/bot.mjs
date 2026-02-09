import { Telegraf } from 'telegraf';
import { User } from './models/users.mjs';
import { WeightLog } from './models/weightLog.mjs';

const bot = new Telegraf(process.env.BOT_LINER_TOKEN);
const userState = new Map();

/* /start */
bot.start(async (ctx) => {
    const telegramId = ctx.from.id;

    const user = await User.findOne({ telegramId });
    if (user) {
        await ctx.reply('Ты уже зарегистрирован');
        return;
    }

    userState.set(telegramId, { step: 'NAME', data: {} });
    await ctx.reply('Как тебя зовут?');
});

async function addWeight(ctx, user = ctx.from) {
    const text = ctx.message.text.trim();
    //12.06.26 66.5 какой-то коментарий
    /* 1. Регулярка:
       - опциональная дата: DD.MM.YY
       - обязательный вес: 66.5 или 66,5
       - опциональный комментарий
    */
    const regex =
        /^(?:(\d{2}\.\d{2}\.\d{2})\s+)?(\d+(?:[.,]\d+)?)\s*(.*)?$/;

    const match = text.match(regex);
    if (!match) {
        await ctx.reply('Неверный формат. Пример: [12.06.26] 66.5 [комментарий]');
        return;
    }

    /* 2. Дата */
    let date;
    if (match[1]) {
        const [day, month, year] = match[1].split('.');
        date = new Date(`20${year}-${month}-${day}`);
    } else {
        date = new Date(); // сегодня
    }

    /* 3. Вес */
    const weight = Number(match[2].replace(',', '.'));
    if (Number.isNaN(weight)) {
        await ctx.reply('Не удалось распознать вес');
        return;
    }

    /* 4. Комментарий */
    const comment = match[3]?.trim() || '';

    /* 5. Обновление или создание записи */
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    await WeightLog.findOneAndUpdate(
        {
            userId: user._id,
            date: { $gte: dayStart, $lte: dayEnd }
        },
        {
            weight,
            comment,
            date
        },
        {
            upsert: true,
            new: true
        }
    );

    await ctx.reply('Вес сохранён');

}

/* Текстовые сообщения */
bot.on('text', async (ctx) => {
    const telegramId = ctx.from.id;
    const text = ctx.message.text;

    const state = userState.get(telegramId);

    /* ЭТАП РЕГИСТРАЦИИ */
    if (state) {
        switch (state.step) {
            case 'NAME':
                state.data.name = text;
                state.step = 'START_WEIGHT';
                await ctx.reply('Сколько ты сейчас весишь?');
                return;

            case 'START_WEIGHT':
                state.data.weightStart = Number(text);
                state.step = 'GOAL';
                await ctx.reply('Какая цель?');
                return;

            case 'GOAL':
                state.data.goal = text;
                state.step = 'TARGET_DATE';
                await ctx.reply('К какому числу? (YYYY-MM-DD)');
                return;

            case 'TARGET_DATE':
                state.data.targetDate = new Date(text);

                await User.create({
                    telegramId,
                    ...state.data
                });

                userState.delete(telegramId);
                await ctx.reply('Регистрация завершена. Присылай вес каждый день.');
                return;
        }
    }

    /* ПОСЛЕ РЕГИСТРАЦИИ — ПРИЁМ ВЕСА */
    const user = await User.findOne({ telegramId });
    if (!user) return;



    addWeight(ctx,user)
});

export default bot;
