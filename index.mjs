import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import  api  from "./js/api.mjs";
import  api_isee  from "./bot_iseeweight/api.mjs";
import bodyParser from "body-parser";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

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
app.use(bodyParser.json());
app.use(express.json());
app.use(
    session({
        secret: process.env.SESSION_SECRET || "change-me",
        resave: false,
        saveUninitialized: false,
        cookie: { sameSite: "lax" }
    })
);
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback"
        },
        async (accessToken, refreshToken, profile, done) => {
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
            const user = {
                googleId: profile.id,
                email,
                name: profile.displayName
            };
            return done(null, user);
        }
    )
);

app.get("/", (req, res) => {
    res.render("index", { 
        title: "Шадрин",
        articles: articles
    });
});

app.get("/app", (req, res) => {
    console.log(req.user)
    res.render("app_isee/app", {
        user: req.user
    });
});

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/app" }),
    (req, res) => {
        res.redirect("/app");
    }
);

app.get("/auth/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.session.destroy(() => {
            res.redirect("/app");
        });
    });
});

app.post("/api/bot_isee", api_isee);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

