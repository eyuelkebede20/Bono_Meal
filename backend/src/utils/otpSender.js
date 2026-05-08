import { db } from "../config/db.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const sendTelegramOTP = async (phone, code) => {
  const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

  if (!user || !user.telegramChatId) {
    throw new Error("User has not linked their Telegram account.");
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: user.telegramChatId,
      text: `Your Bon-Card password reset OTP is: ${code}`,
    }),
  });

  if (!response.ok) {
    throw new Error("Telegram API rejected the request.");
  }
};
