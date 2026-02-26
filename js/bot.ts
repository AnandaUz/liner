import { Telegraf, Context } from 'telegraf';
// import sharp from 'sharp';
import { User, IUser } from './models/users.js';
import { WeightLog } from './models/weightLog.js';

const bot = new Telegraf(process.env.LINER_BOT_TOKEN!);
const userState = new Map<number, { step: string, data: any }>();

/* /start */
bot.start(async (ctx) => {
    const telegramId = ctx.from.id;
    const payload = (ctx as any).payload; // USER_ID из ссылки t.me/bot?start=USER_ID

    let user = await User.findOne({ telegramId });

    if (payload) {
        // Попытка привязать существующий аккаунт
        try {
            const existingUser = await User.findById(payload);
            if (!existingUser) {
                await ctx.reply('Пользователь не найден. Попробуй еще раз через сайт.');
                return;
            }

            if (existingUser.telegramId) {
                if (existingUser.telegramId === telegramId) {
                    await ctx.reply('Этот аккаунт уже привязан к твоему Telegram.');
                } else {
                    await ctx.reply('Этот аккаунт уже привязан к другому Telegram.');
                }
                return;
            }

            // Проверяем, не привязан ли этот telegramId уже к кому-то другому
            if (user) {
                await ctx.reply('Твой Telegram уже привязан к другому аккаунту.');
                return;
            }

            existingUser.telegramId = telegramId;
            await existingUser.save();
            await ctx.reply(`Аккаунт успешно привязан! Привет, ${existingUser.name}. Теперь ты можешь присылать свой вес.`);
            return;
        } catch (err) {
            console.error('Error linking telegram:', err);
            await ctx.reply('Произошла ошибка при привязке аккаунта.');
            return;
        }
    }

    if (user) {
        await ctx.reply(`Привет, ${user.name}! Ты уже зарегистрирован. Присылай свой вес.`);
        return;
    }

    userState.set(telegramId, { step: 'NAME', data: {} });
    await ctx.reply('Как тебя зовут?');
});

async function addWeight(ctx: Context, user: IUser) {
    const message = ctx.message as any;
    if (!message || !message.text) return;

    const text = message.text.trim();
    //12.06.26 66.5 какой-то комментарий
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
    let date: Date;
    if (match[1]) {
        const [day, month, year] = match[1].split('.');
        date = new Date(`20${year}-${month}-${day}`);
    } else {
        date = new Date(); // сегодня
        date.setHours(12,0,0,0)
    }

    /* 3. Вес */
    const weight = Number(match[2].replace(',', '.'));
    if (Number.isNaN(weight)) {
        await ctx.reply('Не удалось распознать вес');
        return;
    }

    /* 4. Комментарий */
    const comment = match[3]?.trim() || '';

    const userUrl = (process.env.BASE_URL||'https://liner.esho.uz') + `/user/${user._id}`;

    let diffText = ''
    // const str = `Вес сохранён: ${weight} кг${diffText}`

    //отправляем сообщение в ТГ
    const sentMsg = await ctx.reply(`Вес сохранён: ${weight} кг${diffText}\n<a href="${userUrl}">ваша страница</a>`, { parse_mode: 'HTML' })
    // Отправка уведомления админу
    const adminId = process.env.LINER_BOT_ADMIN;
    if (adminId) {
        await ctx.telegram.sendMessage(adminId, `🧿 ${user.name} : ${weight} кг ${diffText}\n<a href="${userUrl}">ваша страница</a>`, { parse_mode: 'HTML' })

    }

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
            returnDocument: 'after'
        }
    );

    const dNow = new Date();
    dNow.setHours(12, 0, 0, 0);

    let predDate: Date | null = null
    let diff = 0
    if (user.last_data) {
        predDate = user.last_data.date ? new Date(user.last_data.date) : null;
        if (user.last_data.weight) {
            diff = weight - user.last_data.weight;
        }
    }
    if (predDate && dNow.getTime() === predDate.getTime()) {
        const w = (user.last_data?.weight || 0) - weight

        diff = weight - w;
        // const sign = diff > 0 ? '+' : '';
        // diffText = ` (${sign}${diff.toFixed(2)} кг)`;
    }

    // Сохраняем данные в user
    await User.findByIdAndUpdate(user._id, {
        last_data: {
            weight,
            date: dNow,
            mess_id: sentMsg.message_id,
            weight_delta: diff,
        }
    });
}
export async function doReminder() {
    console.log('Starting doReminder task...');
    try {
        const dNow = new Date();
        dNow.setHours(12, 0, 0, 0);

        // Находим всех пользователей, у которых есть telegramId
        // и у которых либо нет last_data.date, либо дата там не совпадает с dNow
        const usersToRemind = await User.find({
            telegramId: { $exists: true },
            $or: [
                { 'last_data.date': { $lt: dNow } },
                { 'last_data.date': { $exists: false } },
                { 'last_data': { $exists: false } }
            ]
        });

        console.log(`Found ${usersToRemind.length} users to remind.`);

        for (const user of usersToRemind) {
            try {
                if (user.telegramId) {
                    await bot.telegram.sendMessage(user.telegramId, 'Прошу ввести ваши данные');
                    console.log(`Reminder sent to ${user.name} (${user.telegramId})`);
                }
            } catch (err) {
                console.error(`Error sending reminder to ${user.name} (${user.telegramId}):`, err);
            }
        }
        console.log('doReminder task finished.');
    } catch (err) {
        console.error('Error in doReminder:', err);
    }
}
// async function sendSvgAsPng(ctx: Context) {
//     // 1. SVG
//     const svg = `
//   <svg width="500" height="500" viewBox="0 0 500 500"
//        xmlns="http://www.w3.org/2000/svg">
//
//     <!-- белый фон -->
//     <rect x="0" y="0" width="500" height="500" fill="white" />
//
//     <!-- красный круг по центру -->
//     <circle cx="250" cy="250" r="100" fill="red" />
//
//   </svg>
//   `;
//
//     try {
//         // 2. SVG → PNG
//         const pngBuffer = await sharp(Buffer.from(svg))
//             .png()
//             .toBuffer();
//
//         // 3. Отправка в Telegram пользователю
//         await ctx.replyWithPhoto(
//             { source: pngBuffer },
//             { caption: 'График веса (пример)' }
//         );
//     } catch (err) {
//         console.error('Error in sendSvgAsPng:', err);
//         await ctx.reply('Ошибка при генерации изображения');
//     }
// }

/* Текстовые сообщения */
bot.on('text', async (ctx) => {
    const telegramId = ctx.from.id;
    const message = ctx.message as any;
    const text = message.text;

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

    addWeight(ctx, user)
});


export default bot;
