import TelegramBot from "node-telegram-bot-api";
import { db } from "./config/db.js";
import { users } from "./schema.js";
import { eq } from "drizzle-orm";
import "dotenv/config";

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

console.log("🤖 Telegram Bot is running...");

bot.onText(/\/start (.+)/, async (msg, match) => {
  const chatId = msg.chat.id.toString();
  const linkToken = match[1];

  try {
    // 1. Check if this Telegram account is ALREADY linked to someone
    const [existingTelegramUser] = await db.select().from(users).where(eq(users.telegramId, chatId)).limit(1);

    if (existingTelegramUser) {
      return bot.sendMessage(chatId, "⚠️ This Telegram account is already linked to a student. You cannot link multiple accounts to the same Telegram profile.");
    }

    // 2. Find the user trying to link via the token
    const [user] = await db.select().from(users).where(eq(users.telegramLinkToken, linkToken)).limit(1);

    if (!user) {
      return bot.sendMessage(chatId, "❌ Invalid or expired linking token. Please try signing up again.");
    }

    // 3. Link the account and destroy the single-use token
    await db
      .update(users)
      .set({
        telegramId: chatId,
        telegramLinkToken: null,
      })
      .where(eq(users.id, user.id));

    bot.sendMessage(
      chatId,
      `✅ Account linked successfully, ${user.firstName}!\n\nYour account is currently pending Super Admin approval. You will be notified here once you are approved for meal card access.`,
    );
  } catch (error) {
    console.error("Telegram Link Error:", error);
    bot.sendMessage(chatId, "⚠️ A system error occurred while linking your account.");
  }
});

bot.onText(/\/start$/, (msg) => {
  bot.sendMessage(msg.chat.id, "Welcome to the Bono Meal Card system. To link your account, please use the link provided on the web portal after signing up.");
});

export default bot;
