import express from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth.checker.js";
import { topUpUser } from "../controllers/user.controllers.js";
import { db } from "../config/db.js";
import { transactions, cards, users } from "../db/schema.js";
import { eq, and, desc, gte, sum, count } from "drizzle-orm";
import multer from "multer";
import { decodeDenseQR } from "dense-qr-decoder";
import sharp from "sharp";

import fs from "fs";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";

const adminRouter = express.Router();
// ESM __dirname configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Image Download Helper
const downloadAndStoreImage = async (url, userId) => {
  const filename = `${userId}_${Date.now()}.jpg`;
  const localPath = path.join(__dirname, "../../uploads", filename);

  // Ensure directory exists
  if (!fs.existsSync(path.dirname(localPath))) {
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
  }

  const response = await axios({ url, responseType: "stream" });

  return new Promise((resolve, reject) => {
    response.data
      .pipe(fs.createWriteStream(localPath))
      .on("finish", () => resolve(`/uploads/${filename}`))
      .on("error", reject);
  });
};

if (typeof global.ImageData === "undefined") {
  global.ImageData = class ImageData {
    constructor(data, width, height) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
  };
}
// GET /api/transactions
adminRouter.get("/transactions", authMiddleware, async (req, res) => {
  try {
    const { role, id } = req.user;

    // Build the base query using Drizzle's relational syntax
    let query = db.query.transactions.findMany({
      orderBy: [desc(transactions.createdAt)],
      with: {
        card: {
          columns: { cardNumber: true },
          with: {
            owner: {
              columns: { firstName: true, lastName: true, studentId: true },
            },
          },
        },
        user: {
          columns: { firstName: true, lastName: true },
        },
      },
    });

    if (role === "student") {
      // 1. Get the student's active card
      const [studentCard] = await db.select().from(cards).where(eq(cards.ownerId, id)).limit(1);

      if (!studentCard) {
        return res.status(404).json({ error: "Card not found for this user." });
      }

      // 2. Filter transactions by that card
      query = db.query.transactions.findMany({
        where: eq(transactions.cardId, studentCard.id),
        orderBy: [desc(transactions.createdAt)],
        with: {
          card: {
            columns: { cardNumber: true },
            with: {
              owner: { columns: { firstName: true, lastName: true, studentId: true } },
            },
          },
          user: { columns: { firstName: true, lastName: true } },
        },
      });
    }

    const result = await query;
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/metrics
adminRouter.get("/metrics", authMiddleware, roleMiddleware(["super_admin", "finance_admin"]), async (req, res) => {
  try {
    // 1. Count Active/Suspended Cards
    const [activeCardsResult] = await db.select({ value: count() }).from(cards).where(eq(cards.isActive, true));
    const [suspendedCardsResult] = await db.select({ value: count() }).from(cards).where(eq(cards.isActive, false));

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // 2. Aggregate Today's Deductions
    const [todayDeductions] = await db
      .select({
        totalAmount: sum(transactions.amount),
        count: count(),
      })
      .from(transactions)
      .where(and(eq(transactions.type, "daily_deduction"), eq(transactions.status, "completed"), gte(transactions.createdAt, startOfDay)));

    // 3. Aggregate Today's Top Ups
    const [todayTopUps] = await db
      .select({
        totalAmount: sum(transactions.amount),
        count: count(),
      })
      .from(transactions)
      .where(and(eq(transactions.type, "top_up"), eq(transactions.status, "completed"), gte(transactions.createdAt, startOfDay)));

    res.status(200).json({
      cards: {
        active: Number(activeCardsResult.value) || 0,
        suspended: Number(suspendedCardsResult.value) || 0,
      },
      today: {
        deductions: {
          totalAmount: Number(todayDeductions?.totalAmount) || 0,
          count: Number(todayDeductions?.count) || 0,
        },
        topUps: {
          totalAmount: Number(todayTopUps?.totalAmount) || 0,
          count: Number(todayTopUps?.count) || 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/transactions/suspend
adminRouter.post("/transactions/suspend", authMiddleware, roleMiddleware(["finance_admin", "super_admin"]), async (req, res) => {
  try {
    const { cardNumber } = req.body;

    const [card] = await db.select().from(cards).where(eq(cards.cardNumber, cardNumber)).limit(1);
    if (!card) return res.status(404).json({ error: "Card not found" });
    if (!card.isActive) return res.status(400).json({ error: "Card is already suspended." });

    const [updatedCard] = await db.update(cards).set({ isActive: false }).where(eq(cards.id, card.id)).returning();

    res.json({ message: "Card successfully suspended.", card: updatedCard });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/transactions/activate
adminRouter.post("/transactions/activate", authMiddleware, roleMiddleware(["finance_admin", "super_admin"]), async (req, res) => {
  try {
    const { cardNumber } = req.body;

    const [card] = await db.select().from(cards).where(eq(cards.cardNumber, cardNumber)).limit(1);
    if (!card) return res.status(404).json({ error: "Card not found" });
    if (card.isActive) return res.status(400).json({ error: "Card is already active." });

    const [updatedCard] = await db.update(cards).set({ isActive: true }).where(eq(cards.id, card.id)).returning();

    res.json({ message: "Card successfully activated.", card: updatedCard });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/scan
adminRouter.post("/scan", authMiddleware, roleMiddleware(["finance_admin", "super_admin"]), async (req, res) => {
  try {
    const { cardNumber } = req.body;

    // Use Inner Join to get card and owner together (Mongoose .populate equivalent)
    const [result] = await db
      .select({
        card: cards,
        owner: users,
      })
      .from(cards)
      .innerJoin(users, eq(cards.ownerId, users.id))
      .where(eq(cards.cardNumber, cardNumber))
      .limit(1);

    if (!result) {
      return res.status(404).json({ valid: false, message: "Card not found" });
    }

    if (!result.card.isActive) {
      return res.status(403).json({ valid: false, message: "Card is suspended (Insufficient Funds)" });
    }

    res.status(200).json({
      valid: true,
      message: "Meal approved",
      student: {
        firstName: result.owner.firstName,
        lastName: result.owner.lastName,
        studentId: result.owner.studentId,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/transactions/user/:id
adminRouter.get("/transactions/user/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;

    // 1. Find the card
    const [card] = await db.select().from(cards).where(eq(cards.ownerId, userId)).limit(1);
    if (!card) return res.status(200).json([]);

    // 2. Find transactions for that card
    const userTransactions = await db.select().from(transactions).where(eq(transactions.cardId, card.id)).orderBy(desc(transactions.createdAt));

    res.status(200).json(userTransactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

adminRouter.post("/transactions/topup", authMiddleware, roleMiddleware(["finance_admin", "super_admin"]), topUpUser);

// Keep using memoryStorage so sharp can process the buffer directly
const upload = multer({ storage: multer.memoryStorage() });

adminRouter.post("/scan-qr", authMiddleware, roleMiddleware(["finance_admin", "super_admin", "security_guard"]), upload.single("qrImage"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image provided." });

    const { data, info } = await sharp(req.file.buffer).grayscale().threshold(128).raw().toBuffer({ resolveWithObject: true });

    const rawQrText = await decodeDenseQR({
      data: new Uint8ClampedArray(data),
      width: info.width,
      height: info.height,
      channels: info.channels,
    });

    if (!rawQrText) return res.status(400).json({ error: "QR code not detected." });

    // 1. Decode Fayda Payload
    let qrData;
    try {
      const decodedString = Buffer.from(rawQrText, "base64").toString("utf-8");
      qrData = JSON.parse(decodedString);
    } catch (err) {
      return res.status(400).json({ error: "Invalid Fayda QR format." });
    }

    // Ensure we have an ID to query against
    const faydaIdFromQR = qrData.id || qrData.faydaId;
    if (!faydaIdFromQR) return res.status(400).json({ error: "No ID found in QR payload." });

    // 2. Database Lookup
    const [result] = await db.select({ card: cards, owner: users }).from(cards).innerJoin(users, eq(cards.ownerId, users.id)).where(eq(users.faydaId, faydaIdFromQR)).limit(1);

    if (!result) return res.status(404).json({ valid: false, message: "Card not registered." });
    if (!result.card.isActive) return res.status(403).json({ valid: false, message: "Card suspended." });

    // 3. Process Image (Download once and save to DB)
    let localImageUrl = result.owner.faceImage; // Assuming faceImage column exists in your schema

    if (!localImageUrl && qrData.photoUrl) {
      localImageUrl = await downloadAndStoreImage(qrData.photoUrl, result.owner.id);

      // Update DB so we don't download it again next time
      await db.update(users).set({ faceImage: localImageUrl }).where(eq(users.id, result.owner.id));
    }

    res.status(200).json({
      valid: true,
      message: "Meal approved",
      student: {
        firstName: result.owner.firstName,
        lastName: result.owner.lastName,
        studentId: result.owner.studentId,
        faceImage: localImageUrl, // Returns e.g. "/uploads/123_456.jpg"
      },
    });
  } catch (error) {
    console.error("Scanner Error:", error);
    res.status(500).json({ error: "Internal processing error." });
  }
});
export default adminRouter;
