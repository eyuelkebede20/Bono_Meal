import express from "express";
import TelegramBot from "node-telegram-bot-api";
import "dotenv/config";
import { db } from "../config/db.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

const telegramBotRoute = express.Router();
const token = process.env.TELEGRAM_BOT_TOKEN;
export const bot = new TelegramBot(token, { polling: true });

// Listen for the deep link payload (e.g., /start verify_abc123)
bot.onText(/\/start (.+)/, async (msg, match) => {
  const chatId = msg.chat.id.toString();
  const payload = match[1];

  if (payload.startsWith("verify_")) {
    const verifyToken = payload.replace("verify_", "");

    try {
      const [user] = await db.select().from(users).where(eq(users.verificationToken, verifyToken)).limit(1);

      if (!user) {
        return bot.sendMessage(chatId, "Invalid or expired verification link.");
      }

      await db
        .update(users)
        .set({ telegramChatId: chatId, verificationToken: null }) // Link ID and clear token
        .where(eq(users.id, user.id));

      bot.sendMessage(chatId, "✅ Account linked successfully. You will be notified here when Finance approves your Fayda ID.");
    } catch (error) {
      bot.sendMessage(chatId, "Error processing verification.");
      console.error(error);
    }
  }
});

// Standard fallback if they search the bot manually
bot.onText(/\/start$/, (msg) => {
  bot.sendMessage(msg.chat.id, "Welcome to Bon-Card! Please register via the website first to get your linking URL.");
});

export default telegramBotRoute;
