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
  let cleanPhone = msg.contact.phone_number.replace(/\D/g, "");
  const phoneVariations = [cleanPhone, `+${cleanPhone}`];
  if (cleanPhone.startsWith("251")) phoneVariations.push(`0${cleanPhone.substring(3)}`);

  try {
    // upsert: true means if the user doesn't exist, create a shell record with the phone and chatId
    const user = await User.findOneAndUpdate(
      { phone: { $in: phoneVariations } },
      { telegramChatId: chatId, phone: cleanPhone }, // ensure phone is saved
      { returnDocument: "after", upsert: true },
    );

    bot.sendMessage(chatId, "✅ Phone verified! You can now complete your Proceed to the website.", {
      reply_markup: { remove_keyboard: true },
    });
  } catch (error) {
    bot.sendMessage(chatId, "Error linking phone.");
  }
});
export default telegramBotRoute;
