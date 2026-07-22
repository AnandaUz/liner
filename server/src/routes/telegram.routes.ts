import { Router } from "express";
import { getTelegramLink } from "../controllers/telegram.controller.js";
import { doReminder } from "../bot.js";

const router = Router();

router.get("/link", getTelegramLink);

//http://localhost:8080/api/telegram/reminde
router.get("/reminde", doReminder);

export default router;
