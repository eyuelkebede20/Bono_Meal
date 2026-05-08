import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq, and } from "drizzle-orm";
import { db } from "../config/db.js"; // Adjust path if needed
import { users, cards, otps } from "../schema.js"; // Adjust path
import { sendTelegramOTP } from "../utils/otpSender.js";
import { bot } from "../config/telegram.js";
import redisClient from "../config/redis.js"; // Requires Redis setup

export const signup = async (req, res) => {
  try {
    let { firstName, lastName, phone, password, role, studentId, faydaId } = req.body;
    phone = phone.replace(/\D/g, "");

    const [existingUser] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

    if (existingUser && existingUser.password) {
      return res.status(400).json({ error: "This phone number is already registered and active." });
    }

    if (existingUser && existingUser.telegramChatId) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const [user] = await db
        .insert(users)
        .values({
          firstName,
          lastName,
          phone,
          password: hashedPassword,
          role,
          studentId: ["student", "military_student"].includes(role) ? studentId : null,
          faydaId: ["student", "military_student"].includes(role) ? faydaId : null,
          isApproved: false,
          telegramChatId: existingUser.telegramChatId,
        })
        .onConflictDoUpdate({
          target: users.phone,
          set: {
            firstName,
            lastName,
            password: hashedPassword,
            role,
            studentId: ["student", "military_student"].includes(role) ? studentId : null,
            faydaId: ["student", "military_student"].includes(role) ? faydaId : null,
          },
        })
        .returning();

      const code = Math.floor(100000 + Math.random() * 900000).toString();

      await db
        .insert(otps)
        .values({ phone, code })
        .onConflictDoUpdate({
          target: otps.phone, // Ensure phone is marked .unique() in your otps schema
          set: { code, createdAt: new Date() },
        });

      await bot.sendMessage(user.telegramChatId, `Your Signup Verification OTP is: <code>${code}</code>`, { parse_mode: "HTML" });
      res.status(201).json({ message: "Signup details saved. Check Telegram for OTP." });

      if (user.role === "military_student") {
        await db.insert(cards).values({
          cardNumber: user.studentId, // Assuming studentId is used as cardNumber here
          ownerId: user.id,
          balance: "3000.00",
          isActive: false,
        });
      }
    } else {
      res.status(201).json({ message: "Please Link your phone number to the system via Telegram bot first." });
    }
  } catch (error) {
    console.error("Signup Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

export async function verifySignup(req, res) {
  try {
    let { phone, code } = req.body;
    phone = phone.replace(/\D/g, "");

    const [otpRecord] = await db
      .select()
      .from(otps)
      .where(and(eq(otps.phone, phone), eq(otps.code, code)))
      .limit(1);

    if (!otpRecord) return res.status(400).json({ error: "Invalid or expired OTP." });

    // Note: isPhoneVerified field needs to be added to schema if you want to keep this logic
    await db.update(users).set({ isPhoneVerified: true }).where(eq(users.phone, phone));
    await db.delete(otps).where(eq(otps.id, otpRecord.id));

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

    const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

    if (!user || !user.password) return res.status(400).json({ error: "Invalid credentials" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Invalid credentials" });

    if (!user.isApproved) {
      return res.status(403).json({ error: "Your account is pending Super Admin approval." });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.json({ token, role: user.role });
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log(error);
  }
}

export async function logout(req, res) {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      return res.status(400).json({ error: "Authorization header missing" });
    }

    const token = authHeader.replace("Bearer ", "");

    // Redis implementation: set token with 24hr expiry (86400 seconds)
    await redisClient.set(`bl_${token}`, "true", "EX", 86400);

    res.status(200).json({ message: "Successfully logged out on the server." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function resetPassword(req, res) {
  try {
    const { phone, code, newPassword } = req.body;

    const [otpRecord] = await db
      .select()
      .from(otps)
      .where(and(eq(otps.phone, phone), eq(otps.code, code)))
      .limit(1);
    if (!otpRecord) return res.status(400).json({ error: "Invalid or expired OTP." });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ password: passwordHash }).where(eq(users.phone, phone));
    await db.delete(otps).where(eq(otps.id, otpRecord.id));

    res.status(200).json({ message: "Password reset successful." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function requestOtp(req, res) {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone number is required" });

    const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found." });

    if (!user.telegramChatId) {
      return res.status(400).json({ error: "Telegram not linked. Please message the bot first to receive OTPs." });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await db
      .insert(otps)
      .values({ phone, code })
      .onConflictDoUpdate({
        target: otps.phone,
        set: { code, createdAt: new Date() },
      });

    await sendTelegramOTP(phone, code);

    res.status(200).json({ message: "OTP sent to Telegram successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function verifyOtp(req, res) {
  try {
    const { phone, code } = req.body;

    const [otpRecord] = await db
      .select()
      .from(otps)
      .where(and(eq(otps.phone, phone), eq(otps.code, code)))
      .limit(1);
    if (!otpRecord) return res.status(400).json({ error: "Invalid or expired OTP" });

    await db.delete(otps).where(eq(otps.id, otpRecord.id));

    const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

    if (!user) return res.status(404).json({ error: "User not found. Please register first." });
    if (!user.isApproved) return res.status(403).json({ error: "Account pending approval." });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.status(200).json({ token, role: user.role, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export const forgotPassword = async (req, res) => {
  try {
    const { phone } = req.body;
    const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

    if (!user) return res.status(404).json({ error: "User with this phone number not found." });

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await db
      .insert(otps)
      .values({ phone, code })
      .onConflictDoUpdate({
        target: otps.phone,
        set: { code, createdAt: new Date() },
      });

    await sendTelegramOTP(phone, code);
    res.status(200).json({ message: "OTP sent to your Telegram." });
  } catch (error) {
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

export const emergencyRegister = async (req, res) => {
  try {
    const { firstName, lastName, password, phone, studentId, role } = req.body;

    const [existingUser] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (existingUser) return res.status(400).json({ error: "Phone number already registered" });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const [newUser] = await db
      .insert(users)
      .values({
        firstName,
        lastName,
        phone,
        password: passwordHash,
        studentId,
        isPhoneVerified: true,
        role,
        isApproved: true, // Assuming emergency registration bypasses admin approval
      })
      .returning();

    res.status(201).json({ message: "Emergency registration complete", student: newUser });
  } catch (error) {
    console.error("Emergency Reg Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
