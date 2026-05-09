import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq, and } from "drizzle-orm";
import { db } from "../config/db.js"; // Adjust path if needed
import { users, cards, otps } from "../db/schema.js"; // Adjust path
import { sendTelegramOTP } from "../utils/otpSender.js";
import { bot } from "../config/telegram.js";
import crypto from "crypto";

export const signup = async (req, res) => {
  try {
    let { firstName, lastName, phone, password, role, studentId, faydaId } = req.body;
    // Assuming image upload (e.g., idImageUrl) is handled by a middleware like multer before this controller

    phone = phone.replace(/\D/g, "");

    const [existingUser] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

    if (existingUser && existingUser.password) {
      return res.status(400).json({ error: "This phone number is already registered." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate handshake token
    const verifyToken = crypto.randomBytes(16).toString("hex");

    await db
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
        verificationToken: verifyToken,
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
          verificationToken: verifyToken,
        },
      });

    res.status(201).json({
      message: "Registration saved. Please link Telegram to complete setup.",
      verifyToken: verifyToken,
      telegramLink: `https://t.me/bon_card_otp_bot?start=verify_${verifyToken}`,
    });

    const linkToken = crypto.randomBytes(16).toString("hex");

    await db.update(users).set({ telegramLinkToken: linkToken }).where(eq(users.id, newUser.id)); // Assuming newUser holds the inserted user

    // Replace YOUR_BOT_USERNAME with your actual bot handle (without the @)
    const telegramLink = `https://t.me/bon_card_otp_bot?start=${linkToken}`;

    res.status(201).json({
      message: "User registered successfully.",
      telegramLink: telegramLink,
    });
  } catch (error) {
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

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }, // 15 minutes
  );
  const refreshToken = jwt.sign(
    { id: user.id, tokenVersion: user.tokenVersion },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }, // 7 days
  );
  return { accessToken, refreshToken };
};

export async function login(req, res) {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: "Phone and password are required." });

    const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

    if (!user || !user.password) return res.status(400).json({ error: "Invalid credentials" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Invalid credentials" });

    if (!user.isApproved) return res.status(403).json({ error: "Your account is pending Super Admin approval." });

    const tokens = generateTokens(user);
    res.json({ ...tokens, role: user.role });
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

    if (!user) return res.status(404).json({ error: "User not found." });
    if (!user.isApproved) return res.status(403).json({ error: "Account pending approval." });

    const tokens = generateTokens(user);
    res.status(200).json({ ...tokens, role: user.role, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function logout(req, res) {
  try {
    const userId = req.user.id; // requires authMiddleware on the route

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user) {
      // Increment tokenVersion to kill all active refresh tokens
      await db
        .update(users)
        .set({ tokenVersion: user.tokenVersion + 1 })
        .where(eq(users.id, userId));
    }

    res.status(200).json({ message: "Successfully logged out." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function refreshAccessToken(req, res) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: "Refresh token required." });

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      return res.status(403).json({ error: "Invalid or expired refresh token." });
    }

    const [user] = await db.select().from(users).where(eq(users.id, payload.id)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found." });

    // Validate token version
    if (user.tokenVersion !== payload.tokenVersion) {
      return res.status(403).json({ error: "Session invalidated. Please log in again." });
    }

    const tokens = generateTokens(user);
    res.json(tokens);
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

    // Fetch user to increment tokenVersion (logs them out of other devices)
    const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

    await db
      .update(users)
      .set({ password: passwordHash, tokenVersion: user ? user.tokenVersion + 1 : 0 })
      .where(eq(users.phone, phone));

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
