import bcrypt from "bcrypt";
import crypto from "crypto";
import User from "../models/User.js";
import Card from "../models/Card.js";
import Transaction from "../models/Transaction.js";
import jwt from "jsonwebtoken";
import BlacklistedToken from "../models/BlacklistedToken.js";
import { sendTelegramOTP } from "../utils/otpSender.js";
import { bot } from "../config/telegram.js";
import Otp from "../models/Otp.js";

export const signup = async (req, res) => {
  try {
    let { firstName, lastName, phone, password, role, studentId, faydaId } = req.body;

    // 1. Sanitize phone
    phone = phone.replace(/\D/g, "");

    // 2. Check if user is already FULLY registered
    const existingUser = await User.findOne({ phone });
    if (existingUser && existingUser.password) {
      return res.status(400).json({ error: "This phone number is already registered and active." });
    }

    // 3. Verify Telegram Link AND get the Chat ID
    const telegramInfo = await User.findOne({ phone });
    if (!telegramInfo) {
      return res.status(400).json({ error: "Phone number is not linked with Telegram. Message the bot first." });
    }

    // 4. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Build User Data (Including the Chat ID from TelegramLink)
    const userData = {
      firstName,
      lastName,
      password: hashedPassword, // Match your schema field name
      role,
      telegramChatId: telegramInfo.chatId, // CRITICAL: Transfer from TelegramLink to User
      studentId: ["student", "military_student"].includes(role) ? studentId : undefined,
      faydaId: ["student", "military_student"].includes(role) ? faydaId : undefined,
      isApproved: false,
    };

    // 6. Update or Create
    const user = await User.findOneAndUpdate(
      { phone },
      { $set: userData },
      { upsert: true, new: true }, // 'new: true' is the same as 'returnDocument: "after"'
    );

    // 7. Generate and Send OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Use { upsert: true } for OTP so it creates if missing, updates if exists
    await Otp.findOneAndUpdate({ phone }, { code }, { upsert: true });

    await bot.sendMessage(user.telegramChatId, `Your Signup Verification OTP is: <code>${code}</code>`, { parse_mode: "HTML" });
    res.status(201).json({ message: "Signup details saved. Check Telegram for OTP." });
  } catch (error) {
    console.error("Signup Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};
export async function verifySignup(req, res) {
  try {
    let { phone, code } = req.body;
    phone = phone.replace(/\D/g, ""); // Clean it!

    const otpRecord = await Otp.findOne({ phone, code });
    if (!otpRecord) return res.status(400).json({ error: "Invalid or expired OTP." });

    await User.findOneAndUpdate({ phone }, { isPhoneVerified: true });
    await Otp.deleteOne({ _id: otpRecord._id });

    res.status(200).json({ message: "Phone verified successfully. You can now log in." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
export async function login(req, res) {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ error: "Phone and password are required." });
    }

    // Ensure we select the password field
    const user = await User.findOne({ phone }).select("+password");

    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    // FIX: Changed user.passwordHash to user.password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Invalid credentials" });

    // Check approval status before issuing token
    if (!user.isApproved) {
      return res.status(403).json({ error: "Your account is pending Super Admin approval." });
    }

    const token = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });

    // Return token and role
    res.json({ token, role: user.role });
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log(error);
  }
}
export async function logout(req, res) {
  try {
    const authHeader = req.header("Authorization");

    // Check if the header exists before trying to replace
    if (!authHeader) {
      return res.status(400).json({ error: "Authorization header missing" });
    }

    const token = authHeader.replace("Bearer ", "");

    const blacklistedToken = new BlacklistedToken({ token });
    await blacklistedToken.save();

    res.status(200).json({ message: "Successfully logged out on the server." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
export async function resetPassword(req, res) {
  try {
    const { phone, code, newPassword } = req.body;

    const otpRecord = await Otp.findOne({ phone, code });
    if (!otpRecord) return res.status(400).json({ error: "Invalid or expired OTP." });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ phone }, { password: passwordHash });

    await Otp.deleteOne({ _id: otpRecord._id });

    res.status(200).json({ message: "Password reset successful." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
export async function requestOtp(req, res) {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone number is required" });

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ error: "User not found." });

    // Hard stop if they haven't talked to the bot yet
    if (!user.telegramChatId) {
      return res.status(400).json({ error: "Telegram not linked. Please message the bot first to receive OTPs." });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await Otp.findOneAndUpdate({ phone }, { code }, { upsert: true, returnDocument: "after" });

    await sendTelegramOTP(phone, code);

    res.status(200).json({ message: "OTP sent to Telegram successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function verifyOtp(req, res) {
  try {
    const { phone, code } = req.body;

    const otpRecord = await Otp.findOne({ phone, code });
    if (!otpRecord) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // OTP is valid. Delete it.
    await Otp.deleteOne({ _id: otpRecord._id });

    // Check if user exists, if not, create them (Signup flow integration)
    let user = await User.findOne({ phone });

    if (!user) {
      // If you want to require full signup first, return an error here instead.
      // Otherwise, create a basic shell user:
      // user = await User.create({ phone, firstName: "New", lastName: "User" });
      return res.status(404).json({ error: "User not found. Please register first." });
    }

    if (!user.isApproved) {
      return res.status(403).json({ error: "Account pending approval." });
    }

    const token = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.status(200).json({ token, role: user.role, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
const generateAndSendOtp = async (phone) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Save to DB
  await Otp.findOneAndUpdate({ phone }, { code }, { upsert: true, new: true });

  // Trigger external API
  await sendTelegramOTP(phone, code);

  return code;
};
export const forgotPassword = async (req, res) => {
  console.log("1. Reached forgotPassword controller. Body:", req.body);
  try {
    const { phone } = req.body;

    console.log("2. Searching for user with phone:", phone);
    const user = await User.findOne({ phone });

    if (!user) {
      console.log("3. User not found.");
      return res.status(404).json({ error: "User with this phone number not found." });
    }
    console.log("4. User found:", user._id);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("5. Generated OTP:", code);

    await Otp.findOneAndUpdate({ phone }, { code }, { upsert: true, returnDocument: "after" });
    console.log("6. Saved OTP to database.");

    console.log("7. Attempting to send OTP via Telegram...");
    await sendTelegramOTP(phone, code);
    console.log("8. Telegram OTP sent successfully.");

    res.status(200).json({ message: "OTP sent to your Telegram." });
  } catch (error) {
    console.error("9. DEBUG ERROR in forgotPassword:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

// controllers/authController.js

export const emergencyRegister = async (req, res) => {
  try {
    const { firstName, lastName, password, phone, studentId, role } = req.body;

    // 1. Check if the user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ error: "Phone number already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    // 2. Create the new user
    // We set isVerified to true immediately to skip OTP
    const newUser = new User({
      firstName,
      lastName,
      phone,
      password: passwordHash,
      studentId,
      isVerified: true,
      role, // Default role
      registeredBy: req.user._id, // Track which guard performed the registration
      createdAt: new Date(),
    });

    await newUser.save();

    res.status(201).json({
      message: "Emergency registration complete",
      student: newUser,
    });
  } catch (error) {
    console.error("Emergency Reg Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
