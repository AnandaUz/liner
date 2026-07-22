import { Telegraf, Context } from "telegraf";
import { Request, Response } from "express";
import { User } from "./models/User.js";
import { WeightLog } from "./models/WeightLog.js";

const BOT_TOKEN = process.env.BOT_TOKEN || "dummy-token";

export const bot = new Telegraf(BOT_TOKEN);
bot.botInfo = {
  id: 0,
  is_bot: true,
  first_name: "Bot",
  username: "bot",
  can_join_groups: true,
  can_read_all_group_messages: false,
  supports_inline_queries: false,
};

// const userState = new Map<number, { step: string; data: any }>();
const ADMIN_ID = process.env.BOT_ADMIN ? Number(process.env.BOT_ADMIN) : null;

/* /start */
bot.start(async (ctx) => {
  const telegramId = ctx.from.id;
  const payload = ctx.message.text.split(" ")[1];

  let user = await User.findOne({ telegramId });

  if (payload) {
    try {
      const existingUser = await User.findById(payload);
      if (!existingUser) {
        await ctx.reply("Пользователь не найден. Попробуй ещё раз через сайт.");
        return;
      }

      if (existingUser.telegramId) {
        if (existingUser.telegramId === telegramId) {
          await ctx.reply("Этот аккаунт уже привязан к твоему Telegram.");
        } else {
          await ctx.reply("Этот аккаунт уже привязан к другому Telegram.");
        }
        return;
      }

      if (user) {
        await ctx.reply("Твой Telegram уже привязан к другому аккаунту.");
        return;
      }

      existingUser.telegramId = telegramId;
      await existingUser.save();
      await ctx.reply(
        `Аккаунт успешно привязан! Привет, ${existingUser.name}. Теперь присылай свой вес.`,
      );
      return;
    } catch (err) {
      console.error("Ошибка привязки telegram:", err);
      await ctx.reply("Произошла ошибка при привязке аккаунта.");
      return;
    }
  }

  if (user) {
    await ctx.reply(`Привет, ${user.name}! Присылай свой вес.`);
    return;
  }

  await ctx.reply("Привет! Зарегистрируйся на сайте и привяжи аккаунт.");
});

/* Приём веса */
async function addWeight(ctx: Context) {
  if (!ctx) return;
  const message = ctx.message as any;
  if (!message?.text) return;

  //#region найти юзера и записи за последний месяц
  const telegramId = ctx?.from?.id;
  if (!telegramId) return;

  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  const result = await User.aggregate([
    { $match: { telegramId: telegramId } },
    {
      $lookup: {
        from: "weightlogs", // имя коллекции в MongoDB (обычно plural + lowercase)
        let: { userId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$userId", "$$userId"] },
                  { $gte: ["$date", monthAgo] },
                ],
              },
            },
          },
          { $sort: { date: 1 } },
        ],
        as: "weightLogs",
      },
    },
  ]);

  const user = result[0];
  if (!user) {
    await ctx.reply("Сначала привяжи аккаунт через сайт.");
    return;
  }

  //#endregion

  const text = message.text.trim();
  const regex = /^(?:(\d{2}\.\d{2}\.\d{2})\s+)?(\d+(?:[.,]\d+)?)\s*(.*)?$/;
  const match = text.match(regex);

  if (!match) {
    await ctx.reply("Неверный формат. Пример: [12.06.26] 66.5 [комментарий]");
    return;
  }

  let date: Date;
  if (match[1]) {
    const [day, month, year] = match[1].split(".");
    date = new Date(`20${year}-${month}-${day}`);
  } else {
    date = new Date();
  }
  date.setHours(12, 0, 0, 0);

  //
  const lastWeightLog = user.weightLogs[user.weightLogs.length - 1];

  const weight = Number(match[2].replace(",", "."));
  if (Number.isNaN(weight)) {
    await ctx.reply("Не удалось распознать вес");
    return;
  }

  //
  const fRound = (val: number) => {
    return Math.round(val * 10) / 10;
  };

  const wDiff = lastWeightLog?.weight ? weight - lastWeightLog?.weight : 0;

  const comment = match[3]?.trim();
  // const userUrl = process.env.CLIENT_URL || ""; //`${process.env.BASE_URL || ''}/user/${user._id}`;

  let resultText = `${fRound(weight)} ( ${wDiff >= 0 ? "+" : "-"}${fRound(Math.abs(wDiff))}) ${wDiff <= 0 ? "🔸" : "🔹"} ${comment ? `${comment}` : ""}`;

  //- отправка сообщения
  await bot.telegram.deleteMessage(
    ctx?.chat?.id || 0,
    ctx?.message?.message_id || 0,
  );
  const botMessage = user.botMessage;
  if (botMessage) {
    await bot.telegram.editMessageText(
      botMessage.chatId,
      botMessage.messageId,
      undefined,
      resultText,
    );
  }
  //- сохраняем в БД

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const update: any = {
    $set: { weight, date },
  };

  if (comment) {
    update.$set.comment = comment;
  } else {
    update.$unset = { comment: "" };
  }

  await WeightLog.findOneAndUpdate(
    { userId: user._id, date: { $gte: dayStart, $lte: dayEnd } },
    update,
    { upsert: true, returnDocument: "after" },
  );

  //- сообщение админу

  if (ADMIN_ID) {
    await ctx.telegram.sendMessage(ADMIN_ID, `🧿 ${user.name}: ${resultText}`, {
      parse_mode: "HTML",
    });
  }
}

/* Текстовые сообщения */
bot.on("message", async (ctx) => {
  await addWeight(ctx);
});

/* Напоминания */
export async function doReminder(req: Request, res: Response) {
  const password = req.query.password;
  if (password !== process.env.PASSWORD) {
    res.status(401).send("Unauthorized");
    return;
  }

  try {
    const dNow = new Date();
    dNow.setHours(12, 0, 0, 0);

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const result = await User.aggregate([
      { $match: { telegramId: { $exists: true } } },
      {
        $lookup: {
          from: "weightlogs", // имя коллекции в MongoDB
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$userId", "$$userId"] },
                    { $gte: ["$date", monthAgo] },
                  ],
                },
              },
            },
            { $sort: { date: 1 } },
          ],
          as: "weightLogs",
        },
      },
    ]);

    const usersToRemind = result;

    const toDay = new Date();
    // toDay.setHours(0, 0, 0, 0);

    for (const user of usersToRemind) {
      // if (user.telegramId !== 117952884) {
      //   continue;
      // }
      if (!user.telegramId) continue;
      const lastWeightLog = user.weightLogs[user.weightLogs.length - 1];
      // если уже пользователь вводил сегодня данные
      if (lastWeightLog.date >= toDay) {
        continue;
      }
      try {
        // если пользователь не вводил данные, то просто меняю сообщение на новое

        if (lastWeightLog && lastWeightLog.date.getTime() < toDay.getTime()) {
          console.log(user.botMessage);
          try {
            await bot.telegram.deleteMessage(
              user.botMessage.chatId,
              user.botMessage.messageId,
            );
          } catch (err) {
            console.warn(
              "Не удалось удалить сообщение:",
              (err as Error).message,
            );
          }
        }

        const dayCount =
          (toDay.getTime() - lastWeightLog.date.getTime()) /
          (1000 * 60 * 60 * 24);

        const message = await bot.telegram.sendMessage(
          user.telegramId,
          "Прошу ввести ваши данные " +
            (dayCount > 1
              ? `(${Math.round(dayCount)} дней с последних данных)`
              : ""),
        );
        const botMessage = {
          chatId: user.telegramId,
          messageId: message.message_id,
          date: dNow,
        };

        await User.findByIdAndUpdate(user._id, { $set: { botMessage } });
      } catch (err) {
        console.error(`Ошибка напоминания для ${user.name}:`, err);
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    res.status(200).send("Reminders processed");
  } catch (err) {
    console.error("Ошибка в doReminder:", err);
    res.status(500).send("Internal Server Error");
  }
}
