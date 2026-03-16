import User from "../models/user.model.js";

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

// 2. Listen for the shared contact
bot.on("contact", async (msg) => {
  const chatId = msg.chat.id;
  let phone = msg.contact.phone_number;

  // Sanitize phone to match your database format (e.g., remove '+')
  if (phone.startsWith("+")) {
    phone = phone.substring(1);
  }

  try {
    const user = await User.findOneAndUpdate(
      { phone }, // Ensure this matches how phone numbers are saved in your DB
      { telegramChatId: chatId },
      { new: true },
    );

    if (!user) {
      return bot.sendMessage(chatId, "No account found with this phone number. Please sign up on the website first.");
    }

    bot.sendMessage(chatId, "Account linked successfully. You can now receive OTPs here.", {
      reply_markup: { remove_keyboard: true }, // Removes the contact sharing button
    });
  } catch (error) {
    console.error("Telegram Link Error:", error);
    bot.sendMessage(chatId, "An error occurred while linking your account.");
  }
});
