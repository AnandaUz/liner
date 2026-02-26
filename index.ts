import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import path from "path";

import { fileURLToPath } from "url";

import api from "./js/api.js";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User, IUser } from "./js/models/users.js";
import { WeightLog } from "./js/models/weightLog.js";
import { connectDB } from "./js/db.js";
import bot from "./js/bot.js";

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

connectDB().catch(err => {
    console.error("Critical error during initial DB connection:", err);
    // Continue starting the app, so it can at least listen on port 8080 and report status
});

const app = express();
const port = process.env.PORT || 8080;

app.locals.formatDate = function (dateStr: string) {
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
};

// нужно, чтобы корректно получить __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// const articlesPath = path.join(__dirname, "views", "partials", "articles", "articles.json");
// let articles = [];

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const staticDir = process.env.NODE_ENV === "production" ? path.join(__dirname, "public") : "public";
app.use(express.static(staticDir));
if (process.env.NODE_ENV !== "production") {
    app.use("/js", express.static(path.join(__dirname, "dist", "public", "js")));
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
            const user = await User.findById(decoded.id).lean() as IUser | null;
            if (user) {
                req.user = {
                    id: (user._id as any).toString(),
                    googleId: user.googleId,
                    telegramId: user.telegramId,
                    email: user.email,
                    name: user.name,
                    isRegistered: user.isRegistered
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
            callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback"
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
                        isRegistered: false
                    });
                }
                const userData: Express.User = {
                    id: (user._id as any).toString(),
                    googleId: user.googleId,
                    telegramId: user.telegramId,
                    email: user.email,
                    name: user.name,
                    isRegistered: user.isRegistered
                };
                return done(null, userData);
            } catch (err) {
                return done(err);
            }
        }
    )
);

const LINER_BOT_USERNAME = process.env.LINER_BOT_USERNAME || "weight_liner_bot";

app.get("/", (req: Request, res: Response) => {
    if (req.user && !req.user.isRegistered) {
        return res.redirect("/register");
    }
    res.render("layout", {
        body: "partials/center-index",
        user: req.user,
        botUsername: LINER_BOT_USERNAME,
        script: "/js/main.js"
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
        user: req.user
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
                (bot as any).telegram.sendMessage(adminId, `Прошла регистрация: ${user.name}`)
                    .catch((err: any) => console.error("Error sending admin notification:", err));
            }

            // Обновляем токен, так как статус регистрации изменился
            const updatedUserData: Express.User = {
                id: (user._id as any).toString(),
                googleId: user.googleId,
                telegramId: user.telegramId,
                email: user.email,
                name: user.name,
                isRegistered: true
            };
            const token = jwt.sign(updatedUserData, JWT_SECRET, { expiresIn: "7d" });
            res.cookie("auth_token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 30 * 24 * 60 * 60 * 1000
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
            maxAge: 30 * 24 * 60 * 60 * 1000 // 7 дней
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
        script: "/js/user.js"
    });
});

app.get("/api/user-data/:id", async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId).lean() as IUser | null;
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const weightLogsI = await WeightLog.find({ userId }).sort({ date: 1 }).lean();

        const weightLogs: { date: Date, weight: number }[] = []
        weightLogsI.forEach(log => weightLogs.push({ date: log.date, weight: log.weight }));
        res.json({
            user: {
                id: user._id,
                name: user.name,
                weightStart: user.weightStart,
                goal: user.goal,
                targetDate: user.targetDate
            },
            weightLogs
        });
    } catch (err) {
        console.error("Error fetching user data:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/api", api as any);
app.all("/api/reminder", api as any);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

