import bcrypt from "bcrypt";
import crypto from "crypto";
import User from "../models/User.js";
import Card from "../models/Card.js";
import jwt from "jsonwebtoken";
import BlacklistedToken from "../models/BlacklistedToken.js";
import { sendTelegramOTP } from "../utils/otpSender.js";
import Otp from "../models/Otp.js";

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) return res.status(400).json({ error: "Invalid credentials" });

    // Check approval status before issuing token
    if (!user.isApproved) {
      return res.status(403).json({ error: "Your account is pending Super Admin approval." });
    }

    const token = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, role: user.role });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
// export async function signup(req, res) {
//   try {
//     // 1. Destructure all fields expected from the frontend, including phone
//     const { firstName, lastName, email, password, role, studentId, faydaId, phone } = req.body;

//     // 2. Block public super_admin creation entirely
//     if (role === "super_admin") {
//       return res.status(403).json({ error: "Cannot register as super_admin publicly." });
//     }

//     // 3. Enforce roles. Fallback to student if something weird is sent.
//     const assignedRole = role === "finance_admin" ? "finance_admin" : "student";

//     // 4. Auto-approve students, require approval for finance_admin
//     const isApproved = assignedRole === "student" ? true : false;

//     // 5. Hash the password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // 6. Map the fields EXACTLY as they are named in your User schema
//     const newUser = new User({
//       firstName,
//       lastName,
//       email,
//       passwordHash: hashedPassword, // FIX: Matches your schema's 'passwordHash'
//       role: assignedRole,
//       phone, // FIX: Added phone since your schema requires it
//       // Only attach studentId and faydaId if the user is a student
//       studentId: assignedRole === "student" ? studentId : undefined,
//       faydaId: assignedRole === "student" ? faydaId : undefined, // FIX: Assign faydaId correctly
//       isApproved,
//     });

//     const savedUser = await newUser.save();

//     // 7. Generate card if student
//     if (savedUser.role === "student") {
//       const newCard = new Card({
//         // If faydaId wasn't provided for some reason, fallback to random
//         cardNumber: faydaId || Math.random().toString().slice(2, 18),
//         owner: savedUser._id,
//       });
//       const savedCard = await newCard.save();
//       savedUser.activeCard = savedCard._id;
//       await savedUser.save();
//     }

//     res.status(201).json({
//       message: assignedRole === "finance_admin" ? "Registration successful. Please wait for Super Admin approval." : "Registration successful. You can now log in.",
//     });
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// }

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

// 1. SIGNUP
export async function signup(req, res) {
  try {
    const { firstName, lastName, phone, password, role, studentId, faydaId } = req.body;

    const existingUser = await User.findOne({ phone });
    if (existingUser) return res.status(400).json({ error: "Phone already registered." });

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstName,
      lastName,
      phone,
      passwordHash,
      role,
      studentId,
      faydaId,
      isApproved: role === "student", // Auto-approve students, admins need manual approval
      isPhoneVerified: false,
    });

    await newUser.save();
    await generateAndSendOtp(phone);

    res.status(201).json({ message: "User registered. OTP sent to phone." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 2. VERIFY SIGNUP
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

// 3. FORGOT PASSWORD
export async function forgotPassword(req, res) {
  try {
    const { phone } = req.body;

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ error: "User not found." });

    await generateAndSendOtp(phone);
    res.status(200).json({ message: "OTP sent to phone for password reset." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 4. RESET PASSWORD
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
