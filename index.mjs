import "dotenv/config";
import express from "express";
import path from "path";

import { fileURLToPath } from "url";

import  api  from "./js/api.mjs";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "./js/models/users.mjs";
import { WeightLog } from "./js/models/weightLog.mjs";
import { connectDB } from "./js/db.mjs";
import bot from "./js/bot.mjs";

connectDB();

const app = express();
const port = process.env.PORT || 2000;

app.locals.formatDate = function (dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
};

// нужно, чтобы корректно получить __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const articlesPath = path.join(__dirname, "views", "partials", "articles", "articles.json");
let articles = [];

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static("public"));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(passport.initialize());

const JWT_SECRET = process.env.JWT_SECRET || "your-very-secret-key";
console.log("JWT_SECRET used:", JWT_SECRET === "your-very-secret-key" ? "default" : "from env");

const authenticateToken = (req, res, next) => {
    const token = req.cookies.auth_token;
    if (!token) {
        req.user = null;
        return next();
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
            req.user = null;
            return next();
        }
        
        // Опционально: проверяем актуальные данные в БД, чтобы telegramId подтянулся сразу после привязки
        // Но для производительности можно оставить как есть, и обновлять токен при релоге.
        // Или просто искать пользователя в БД каждый раз.
        try {
            const user = await User.findById(decoded.id).lean();
            if (user) {
                req.user = {
                    id: user._id.toString(),
                    googleId: user.googleId,
                    telegramId: user.telegramId,
                    email: user.email,
                    name: user.name,
                    isRegistered: user.isRegistered
                };
            } else {
                req.user = null;
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
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback"
        },
        async (accessToken, refreshToken, profile, done) => {
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
            try {
                let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });
                if (!user) {
                    user = await User.create({
                        googleId: profile.id,
                        email,
                        name: profile.displayName,
                        isRegistered: false
                    });
                }
                const userData = {
                    id: user._id.toString(),
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

app.get("/", (req, res) => {
    if (req.user && !req.user.isRegistered) {
        return res.redirect("/register");
    }
    res.render("layout", {
        body: "partials/center-index",
        user: req.user,
        botUsername: LINER_BOT_USERNAME,
        script: "/js/main.mjs"
    });
});

app.get("/register", (req, res) => {
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

app.post("/register", async (req, res) => {
    if (!req.user) {
        console.log("Register POST: No user in request");
        return res.sendStatus(401);
    }
    const { name, weightStart, goal, targetDate } = req.body;
    console.log("Register POST for user:", req.user.id, "Body:", req.body);

    try {
        console.log("Searching user with ID:", req.user.id);
        const user = await User.findById(req.user.id);
        if (user) {
            console.log("User found in DB:", user._id);
            user.name = name;
            user.weightStart = Number(weightStart);
            // user.goal = Number(goal);
            // user.targetDate = new Date(targetDate);
            user.isRegistered = true;
            await user.save();
            console.log("User updated successfully");

            // Отправка уведомления админу
            const adminId = process.env.LINER_BOT_ADMIN;
            if (adminId) {
                bot.telegram.sendMessage(adminId, `Прошла регистрация: ${user.name}`)
                    .catch(err => console.error("Error sending admin notification:", err));
            }

            // Обновляем токен, так как статус регистрации изменился
            const updatedUserData = {
                id: user._id.toString(),
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
    (req, res) => {
        console.log("Google callback successful, user:", req.user);
        const token = jwt.sign(req.user, JWT_SECRET, { expiresIn: "7d" });
        res.cookie("auth_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 30 * 24 * 60 * 60 * 1000 // 7 дней
        });
        res.redirect("/");
    }
);

app.get("/auth/logout", (req, res) => {
    res.clearCookie("auth_token");
    res.redirect("/");
});

app.get("/user/:id", (req, res) => {
    res.render("layout", {
        body: "user",
        user: req.user,
        targetUserId: req.params.id,
        botUsername: LINER_BOT_USERNAME,
        script: "/js/user.mjs"
    });
});

app.get("/api/user-data/:id", async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId).lean();
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const weightLogsI = await WeightLog.find({ userId }).sort({ date: 1 }).lean();

        const weightLogs = []
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

app.post("/api", api);
app.all("/api/reminder", api);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

