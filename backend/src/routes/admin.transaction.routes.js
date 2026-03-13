import express from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth.checker.js";
import Transaction from "../models/Transaction.js";
import { topUpUser } from "../controllers/user.controllers.js";
import Card from "../models/Card.js";

const adminRouter = express.Router();

// GET /api/transactions

adminRouter.get("/transactions", authMiddleware, async (req, res) => {
  try {
    const { role, id } = req.user;
    let query = {};

    if (role === "student") {
      const card = await Card.findOne({ owner: id });
      if (!card) {
        return res.status(404).json({ error: "Card not found for this user." });
      }
      query.card = card._id;
    }

    const transactions = await Transaction.find(query)
      .populate({
        path: "card",
        select: "cardNumber",
        populate: {
          path: "owner",
          select: "firstName lastName studentId",
        },
      })
      .populate("user", "firstName lastName")
      .sort({ createdAt: -1 });

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
adminRouter.get("/metrics", authMiddleware, roleMiddleware(["super_admin", "finance_admin"]), async (req, res) => {
  try {
    const totalActiveCards = await Card.countDocuments({ isActive: true });
    const totalSuspendedCards = await Card.countDocuments({ isActive: false });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayDeductions = await Transaction.aggregate([
      {
        $match: {
          type: "daily_deduction",
          createdAt: { $gte: startOfDay },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const todayTopUps = await Transaction.aggregate([
      {
        $match: {
          type: "top_up",
          createdAt: { $gte: startOfDay },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      cards: {
        active: totalActiveCards,
        suspended: totalSuspendedCards,
      },
      today: {
        deductions: todayDeductions[0] || { totalAmount: 0, count: 0 },
        topUps: todayTopUps[0] || { totalAmount: 0, count: 0 },
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
adminRouter.post("/transactions/suspend", authMiddleware, roleMiddleware(["finance_admin", "super_admin"]), async (req, res) => {
  try {
    const { cardNumber } = req.body;

    const card = await Card.findOne({ cardNumber });
    if (!card) return res.status(404).json({ error: "Card not found" });

    if (!card.isActive) return res.status(400).json({ error: "Card is already suspended." });

    card.isActive = false;
    await card.save();

    res.json({ message: "Card successfully suspended.", card });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/transactions/activate
adminRouter.post("/transactions/activate", authMiddleware, roleMiddleware(["finance_admin", "super_admin"]), async (req, res) => {
  try {
    const { cardNumber } = req.body;

    const card = await Card.findOne({ cardNumber });
    if (!card) return res.status(404).json({ error: "Card not found" });

    if (card.isActive) return res.status(400).json({ error: "Card is already active." });

    card.isActive = true;
    await card.save();

    res.json({ message: "Card successfully activated.", card });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
adminRouter.post("/scan", authMiddleware, roleMiddleware(["finance_admin", "super_admin"]), async (req, res) => {
  try {
    const { cardNumber } = req.body;

    const card = await Card.findOne({ cardNumber }).populate("owner");

    if (!card) {
      return res.status(404).json({ valid: false, message: "Card not found" });
    }

    if (!card.isActive) {
      return res.status(403).json({ valid: false, message: "Card is suspended (Insufficient Funds)" });
    }

    // If card is active, it means the daily deduction succeeded.
    res.status(200).json({
      valid: true,
      message: "Meal approved",
      student: {
        firstName: card.owner.firstName,
        lastName: card.owner.lastName,
        studentId: card.owner.studentId,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

adminRouter.get("/transactions/user/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;

    // 1. Find the card belonging to this user
    const card = await Card.findOne({ owner: userId });
    if (!card) return res.status(200).json([]); // Return empty array if no card found

    // 2. Find transactions for that card
    const transactions = await Transaction.find({ card: card._id }).sort({ createdAt: -1 });

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
adminRouter.post("/transactions/topup", authMiddleware, roleMiddleware(["finance_admin", "super_admin"]), topUpUser);

export default adminRouter;
