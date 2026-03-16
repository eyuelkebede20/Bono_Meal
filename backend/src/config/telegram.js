import express from "express";
import TelegramBot from "node-telegram-bot-api";
import "dotenv/config";
import User from "../models/User.js";

const telegramBotRoute = express.Router();

// Initialize bot
const token = process.env.TELEGRAM_BOT_TOKEN;
export const bot = new TelegramBot(token, { polling: true });

// 1. Listen for the /start command
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
  const chatId = msg.chat.id;

  // Clean it up completely (extract only digits)
  let cleanPhone = msg.contact.phone_number.replace(/\D/g, "");

  // Create variations to check against your DB
  const phoneVariations = [
    cleanPhone, // e.g., 251954956260
    `+${cleanPhone}`, // e.g., +251954956260
  ];

  // Handle local 09 format
  if (cleanPhone.startsWith("251")) {
    phoneVariations.push(`0${cleanPhone.substring(3)}`); // e.g., 0954956260
  }

  try {
    const user = await User.findOneAndUpdate({ phone: { $in: phoneVariations } }, { telegramChatId: chatId }, { returnDocument: "after" });

    if (!user) {
      return bot.sendMessage(chatId, "No account found with this phone number. Please sign up on the website first.");
    }

    bot.sendMessage(chatId, "✅ Account updated successfully! Your Telegram is now linked. Go back to the website and click 'Send OTP'.", {
      reply_markup: { remove_keyboard: true },
    });
  } catch (error) {
    console.error("Telegram Link Error:", error);
    bot.sendMessage(chatId, "An error occurred while linking your account.");
  }
});
export default telegramBotRoute;
