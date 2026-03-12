import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User';
import { generateToken } from '../utils/jwt';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req: Request, res: Response) => {
    const { credential } = req.body;
    try {
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        if (!payload || !payload.email) {
            return res.status(400).json({ error: 'Невалидный токен Google' });
        }

        // Поиск или создание пользователя в БД
        let user = await User.findOne({ googleId: payload.sub });

        if (!user) {
            user = new User({
                googleId: payload.sub,
                name: payload.name || 'Anonymous',
                settings: {
                    account: {
                        weightStart: undefined
                    },
                    privacy: {
                        showMyPage: false
                    },
                    goals: []
                }
            });
            await user.save();
        } else {
            // Опционально: обновить данные пользователя (имя) при входе
            if (payload.name) {
                user.name = payload.name;
            }
            await user.save();
        }

        // Генерируем собственный JWT для сессии
        const token = generateToken({
            id: user._id,
            googleId: user.googleId,
            email: payload.email,
            name: user.name,
            picture: payload.picture
        });

        // Сохраняем токен в БД для пользователя
        user.token = token;
        await user.save();

        return res.json({
            token,
            user: {
                id: user._id,
                googleId: user.googleId,
                email: payload.email,
                name: user.name,
                picture: payload.picture,
                isRegistered: user.isRegistered,
                weightStart: user.settings.account.weightStart,
                telegramId: user.telegramId
            }
        });
    } catch (error) {
        console.error('Ошибка верификации токена Google:', error);
        res.status(401).json({ error: 'Ошибка авторизации' });
    }
};
