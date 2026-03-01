import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import api from "./api.js";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User, IUser } from "./models/users.js";
import { WeightLog } from "./models/weightLog.js";
import { connectDB } from "./db.js";
import bot from "./bot.js";
import { createServer as createViteServer } from "vite";

declare global {
    namespace Express {
        interface User {
            id: string;
            googleId?: string;
            telegramId?: number;
            email?: string;
            name?: string;
            isRegistered: boolean;
        }
    }
}

const app = express();
const port = process.env.PORT || 8080;

import fs from "fs";

async function startServer() {
    console.log("Starting server process...");
    console.log("NODE_ENV:", process.env.NODE_ENV);
    console.log("PORT:", process.env.PORT);
    console.log("Current working directory:", process.cwd());

    let vite: any;
    const isProd = process.env.NODE_ENV === "production";

    if (!isProd) {
        vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "custom",
        });
        app.use(vite.middlewares);
    }

    let manifest: Record<string, any> = {};
    if (isProd) {
        const manifestPath = path.join(process.cwd(), "dist/public/.vite/manifest.json");
        try {
            if (fs.existsSync(manifestPath)) {
                manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
            } else {
                console.error("Vite manifest not found at:", manifestPath);
            }
        } catch (err) {
            console.error("Error loading Vite manifest:", err);
        }
    }

    function getAssets(entry: string) {
        if (!isProd) {
            const script = entry === "desk" ? `/src/client/desk.ts` : `/src/client/js/${entry}.ts`;
            return { script, stylesheets: [] };
        }
        const manifestKey = entry === "desk" ? `src/client/desk.ts` : `src/client/js/${entry}.ts`;
        const entryData = manifest[manifestKey];
        if (!entryData) {
            console.warn(`No manifest entry found for: ${manifestKey}`);
            return { script: "", stylesheets: [] };
        }

        const script = `/${entryData.file}`;
        const stylesheets: string[] = [];

        if (entryData.css) {
            entryData.css.forEach((css: string) => stylesheets.push(`/${css}`));
        }

        // В Vite 5+ стили могут быть в импортируемых чанках
        if (entryData.imports) {
            entryData.imports.forEach((importKey: string) => {
                const importData = manifest[importKey];
                if (importData && importData.css) {
                    importData.css.forEach((css: string) => {
                        const cssPath = `/${css}`;
                        if (!stylesheets.includes(cssPath)) {
                            stylesheets.push(cssPath);
                        }
                    });
                }
            });
        }

        return { script, stylesheets };
    }

    app.locals.formatDate = function (dateStr: string) {
        const [y, m, d] = dateStr.split("-");
        return `${d}.${m}.${y}`;
    };



    app.set("view engine", "ejs");
    app.set("views", path.join(process.cwd(), "views"));

    const staticDir = path.join(process.cwd(), "public");
    app.use(express.static(staticDir));

    if (isProd) {
        app.use(express.static(path.join(process.cwd(), "dist", "public")));
    }

    app.use(cookieParser());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    app.use(passport.initialize());

    const JWT_SECRET = process.env.JWT_SECRET || "your-very-secret-key";
    console.log("JWT_SECRET used:", JWT_SECRET === "your-very-secret-key" ? "default" : "from env");

    const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
        const token = req.cookies.auth_token;
        if (!token) {
            req.user = undefined;
            return next();
        }

        jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
            if (err) {
                req.user = undefined;
                return next();
            }

            try {
                const user = (await User.findById(decoded.id).lean()) as IUser | null;
                if (user) {
                    req.user = {
                        id: (user._id as any).toString(),
                        googleId: user.googleId,
                        telegramId: user.telegramId,
                        email: user.email,
                        name: user.name,
                        isRegistered: user.isRegistered,
                    };
                } else {
                    req.user = undefined;
                }
            } catch (e) {
                req.user = decoded;
            }
            next();
        });
    };

    app.use(authenticateToken);

    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID!,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
                callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback",
            },
            async (accessToken, refreshToken, profile, done) => {
                const email = profile.emails && profile.emails[0] ? profile.emails[0].value : undefined;
                try {
                    let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });
                    if (!user) {
                        user = await User.create({
                            googleId: profile.id,
                            email: email || undefined,
                            name: profile.displayName,
                            isRegistered: false,
                        });
                    }
                    const userData: Express.User = {
                        id: (user._id as any).toString(),
                        googleId: user.googleId,
                        telegramId: user.telegramId,
                        email: user.email,
                        name: user.name,
                        isRegistered: user.isRegistered,
                    };
                    return done(null, userData);
                } catch (err) {
                    return done(err);
                }
            }
        )
    );

    const IS_DEV = process.env.IS_DEV === 'true' || process.env.NODE_ENV !== 'production';
    const LINER_BOT_USERNAME = IS_DEV ? (process.env.LINER_BOT_USERNAME_DEV) : (process.env.LINER_BOT_USERNAME);

    app.get("/", (req: Request, res: Response) => {
        if (req.user && !req.user.isRegistered) {
            return res.redirect("/register");
        }
        res.render("layout", {
            body: "partials/center-index",
            user: req.user,
            botUsername: LINER_BOT_USERNAME,
            ...getAssets("main"),
        });
    });

    app.get("/register", (req: Request, res: Response) => {
        if (!req.user) {
            return res.redirect("/");
        }
        if (req.user.isRegistered) {
            return res.redirect("/");
        }
        res.render("layout", {
            body: "register",
            user: req.user,
            botUsername: LINER_BOT_USERNAME,
            ...getAssets("main"), // Или какой-то другой ассет, если для регистрации нужен свой
        });
    });

    app.post("/register", async (req: Request, res: Response) => {
        if (!req.user) {
            console.log("Register POST: No user in request");
            return res.sendStatus(401);
        }
        const { name, weightStart } = req.body;
        console.log("Register POST for user:", req.user.id, "Body:", req.body);

        try {
            console.log("Searching user with ID:", req.user.id);
            const user = await User.findById(req.user.id);
            if (user) {
                console.log("User found in DB:", user._id);
                user.name = name;
                user.weightStart = Number(weightStart);
                user.isRegistered = true;
                await user.save();
                console.log("User updated successfully");

                // Отправка уведомления админу
                const adminId = process.env.LINER_BOT_ADMIN;
                if (adminId) {
                    (bot as any).telegram
                        .sendMessage(adminId, `Прошла регистрация: ${user.name}`)
                        .catch((err: any) => console.error("Error sending admin notification:", err));
                }

                // Обновляем токен, так как статус регистрации изменился
                const updatedUserData: Express.User = {
                    id: (user._id as any).toString(),
                    googleId: user.googleId,
                    telegramId: user.telegramId,
                    email: user.email,
                    name: user.name,
                    isRegistered: true,
                };
                const token = jwt.sign(updatedUserData, JWT_SECRET, { expiresIn: "7d" });
                res.cookie("auth_token", token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: 30 * 24 * 60 * 60 * 1000,
                });
                return res.redirect("/");
            } else {
                console.log("User not found in DB with ID:", req.user.id);
                res.redirect("/");
            }
        } catch (err) {
            console.error("Error during registration:", err);
            res.status(500).send("Ошибка при регистрации");
        }
    });

    app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

    app.get(
        "/auth/google/callback",
        passport.authenticate("google", { failureRedirect: "/app", session: false }),
        (req: Request, res: Response) => {
            console.log("Google callback successful, user:", req.user);
            const token = jwt.sign(req.user as Express.User, JWT_SECRET, { expiresIn: "7d" });
            res.cookie("auth_token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 30 * 24 * 60 * 60 * 1000, // 7 дней
            });
            res.redirect("/");
        }
    );

    app.get("/auth/logout", (req: Request, res: Response) => {
        res.clearCookie("auth_token");
        res.redirect("/");
    });

    app.get("/user/:id", (req: Request, res: Response) => {
        res.render("layout", {
            body: "user",
            user: req.user,
            targetUserId: req.params.id,
            botUsername: LINER_BOT_USERNAME,
            ...getAssets("user"),
        });
    });

    app.get("/news", (req: Request, res: Response) => {
        res.render("layout", {
            body: "news",
            user: req.user,
            botUsername: LINER_BOT_USERNAME,
            ...getAssets("main"),
        });
    });

    app.get("/api/user-data/:id", async (req: Request, res: Response) => {
        try {
            const userId = req.params.id;
            const user = (await User.findById(userId).lean()) as IUser | null;
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            const weightLogsI = await WeightLog.find({ userId }).sort({ date: 1 }).lean();

            const weightLogs: { date: Date; weight: number }[] = [];
            weightLogsI.forEach((log) => weightLogs.push({ date: log.date, weight: log.weight }));
            res.json({
                user: {
                    id: user._id,
                    name: user.name,
                    weightStart: user.weightStart,
                    goal: user.goal,
                    targetDate: user.targetDate,
                },
                weightLogs,
            });
        } catch (err) {
            console.error("Error fetching user data:", err);
            res.status(500).json({ error: "Internal server error" });
        }
    });

    app.post("/api", api as any);
    app.all("/api/reminder", api as any);

    app.listen(Number(port), '0.0.0.0', () => {
        console.log(`Server running on http://localhost:${port} in ${isProd ? "production" : "development"} mode`);
    });

    // Connect to DB AFTER starting the server to avoid Cloud Run timeout
    try {
        await connectDB();
    } catch (err) {
        console.error("Critical error during initial DB connection:", err);
    }
}

startServer().catch(err => {
    console.error("Failed to start server:", err);
    process.exit(1);
});

