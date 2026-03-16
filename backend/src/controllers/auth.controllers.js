import bcrypt from "bcrypt";
import crypto from "crypto";
import User from "../models/Use.js";
import Card from "../models/Car.js";
import Transaction from "../models/Transactio.js";
import jwt from "jsonwebtoken";
import BlacklistedToken from "../models/BlacklistedToken.js";
import { sendTelegramOTP } from "../utils/otpSender.js";
import Otp from "../models/Otp.js";

export const signup = async (req, res) => {
  try {
    const { firstName, lastName, phone, password, role, studentId, faydaId } = req.body;

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ error: "Phone number already registered." });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const isMilitary = role === "military_student";

    const newUser = new User({
      firstName,
      lastName,
      phone,
      password: passwordHash,
      role,
      studentId: ["student", "military_student"].includes(role) ? studentId : undefined,
      faydaId: ["student", "military_student"].includes(role) ? faydaId : undefined,
      isApproved: false,
    });

    await newUser.save();

    if (isMilitary) {
      const newCard = await Card.create({
        owner: newUser._id,
        cardNumber: `MIL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        balance: 3000,
        isActive: false,
      });

      newUser.activeCard = newCard._id;
      await newUser.save();

      await Transaction.create({
        card: newCard._id,
        user: newUser._id,
        type: "top_up",
        amount: 3000,
        status: "completed",
        description: "Initial Military Allowance",
      });
    }

    // Generate and save OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await Otp.findOneAndUpdate({ phone }, { code }, { upsert: true, returnDocument: "after" });

    console.log(`OTP for ${phone} is ${code}`); // Uncomment to view in terminal
    res.status(201).json({ message: "Signup successful. OTP generated.", user: newUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export async function verifySignup(req, res) {
  try {
    const { phone, code } = req.body;

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
    await User.findOneAndUpdate({ phone }, { passwordHash });

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

    // Generate a 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to database (upsert if they requested another one quickly)
    await Otp.findOneAndUpdate({ phone }, { code }, { upsert: true, new: true });

    // TODO: Call your Third-Party Telegram/SMS API here
    // await sendTelegramOTP(phone, code);

    // For testing, just log it:
    console.log(`Sending OTP ${code} to ${phone}`);

    res.status(200).json({ message: "OTP sent successfully" });
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
