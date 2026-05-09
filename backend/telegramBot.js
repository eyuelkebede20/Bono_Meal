import TelegramBot from "node-telegram-bot-api";
import { db } from "./src/config/db.js";
import { users } from "./src/db/schema.js";
import { eq } from "drizzle-orm";
import "dotenv/config";

const token = process.env.TELEGRAM_BOT_TOKEN;

// Initialize bot
const bot = new TelegramBot(token, { polling: true });

console.log("🤖 Telegram Bot is running...");

bot.onText(/\/start (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const linkToken = match[1]; // The token from the deep link

  try {
    // Find the user with this specific link token
    const [user] = await db.select().from(users).where(eq(users.telegramLinkToken, linkToken)).limit(1);

    if (!user) {
      return bot.sendMessage(chatId, "❌ Invalid or expired linking token. Please try signing up again.");
    }

    // Link the account and destroy the single-use token
    await db
      .update(users)
      .set({
        telegramId: chatId.toString(),
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

// Basic start command for users who search the bot manually
bot.onText(/\/start$/, (msg) => {
  bot.sendMessage(msg.chat.id, "Welcome to the Bono Meal Card system. To link your account, please use the link provided on the web portal after signing up.");
});

export default bot;
