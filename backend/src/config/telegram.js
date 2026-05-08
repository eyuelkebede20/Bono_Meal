import express from "express";
import TelegramBot from "node-telegram-bot-api";
import "dotenv/config";
import { db } from "../config/db.js";
import { users } from "../db/schema.js";
import { inArray, eq } from "drizzle-orm";

const telegramBotRoute = express.Router();

const token = process.env.TELEGRAM_BOT_TOKEN;
export const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const opts = {
    reply_markup: {
      keyboard: [[{ text: "Share Phone Number", request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  };
  bot.sendMessage(chatId, "Welcome to Bon-Card! Please share your phone number to link your account for password resets.", opts);
});

bot.on("contact", async (msg) => {
  const chatId = msg.chat.id.toString();
  let cleanPhone = msg.contact.phone_number.replace(/\D/g, "");
  const phoneVariations = [cleanPhone, `+${cleanPhone}`];
  if (cleanPhone.startsWith("251")) phoneVariations.push(`0${cleanPhone.substring(3)}`);

  try {
    // 1. Check if user exists using any of the phone variations
    const [existingUser] = await db.select().from(users).where(inArray(users.phone, phoneVariations)).limit(1);

    if (existingUser) {
      // 2. Update existing user
      await db.update(users).set({ telegramChatId: chatId }).where(eq(users.id, existingUser.id));
    } else {
      // 3. Insert new shell user (using Telegram name data for NOT NULL fields)
      await db.insert(users).values({
        firstName: msg.from?.first_name || "Pending",
        lastName: msg.from?.last_name || "User",
        phone: cleanPhone,
        telegramChatId: chatId,
        role: "student",
        isApproved: false,
      });
    }

    bot.sendMessage(chatId, "✅ Phone verified! You can now proceed to the website.", {
      reply_markup: { remove_keyboard: true },
    });
  } catch (error) {
    bot.sendMessage(chatId, "Error linking phone.");
    console.error(error);
  }
});

export default telegramBotRoute;
