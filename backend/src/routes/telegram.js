import express from "express";
import User from "../models/User.js";

const telegramRoutes = express.Router();

telegramRoutes.post("/webhook", async (req, res) => {
  const message = req.body.message;

  if (message && message.contact) {
    const phone = message.contact.phone_number;
    const chatId = message.chat.id.toString();

    // Match phone number (ensure formatting matches your DB, e.g., with or without '+')
    await User.findOneAndUpdate(
      { phone: { $regex: phone.slice(-9) } }, // Matches last 9 digits
      { telegramChatId: chatId },
    );

    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: "Account linked. You can now receive OTPs." }),
    });
  }

  res.sendStatus(200);
});

export default telegramRoutes;
