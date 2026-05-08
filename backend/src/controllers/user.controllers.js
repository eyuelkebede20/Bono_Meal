import express from "express";
import { db } from "../config/db.js";
import { users, cards, transactions } from "../db/schema.js";
import { eq, or, and, ilike, sql, count } from "drizzle-orm";

export async function fetchAllUsers(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limitAmount = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const roleFilter = req.query.role;

    const offsetAmount = (page - 1) * limitAmount;

    // Build conditional logic array
    const conditions = [];
    if (roleFilter) conditions.push(eq(users.role, roleFilter));

    if (search) {
      conditions.push(or(ilike(users.firstName, `%${search}%`), ilike(users.lastName, `%${search}%`), ilike(users.phone, `%${search}%`), ilike(users.studentId, `%${search}%`)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Query Total Count
    const [totalRecord] = await db.select({ total: count() }).from(users).where(whereClause);
    const totalUsers = Number(totalRecord.total);

    // Query Paginated Users with active card
    const paginatedUsers = await db.query.users.findMany({
      where: whereClause,
      limit: limitAmount,
      offset: offsetAmount,
      orderBy: (users, { desc }) => [desc(users.createdAt)],
      with: {
        ownedCards: {
          where: (cards, { eq }) => eq(cards.isActive, true),
          limit: 1, // Acts like the old Mongoose 'populate activeCard'
        },
      },
    });

    res.status(200).json({
      users: paginatedUsers.map((u) => {
        const { password, ...safeUser } = u; // Omit password
        return { ...safeUser, activeCard: u.ownedCards[0] || null };
      }),
      pagination: {
        totalUsers,
        totalPages: Math.ceil(totalUsers / limitAmount),
        currentPage: page,
        pageSize: limitAmount,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function fetchSome(req, res) {
  try {
    const userId = req.params.id;
    // Note: Drizzle UUID validation is strict, Postgres will throw if invalid format
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { password: false }, // Exclude password
      with: {
        ownedCards: {
          where: (cards, { eq }) => eq(cards.isActive, true),
          limit: 1,
        },
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.status(200).json({ ...user, activeCard: user.ownedCards[0] || null });
  } catch (error) {
    if (error.code === "22P02") return res.status(400).json({ error: "Invalid User ID format" });
    res.status(500).json({ error: error.message });
  }
}

export async function pendingUser(req, res) {
  try {
    const pendingUsers = await User.find({ isApproved: false }).select("-password");
    res.json(pendingUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function scanUser(req, res) {}

export async function topUpUser(req, res) {
  try {
    const { cardNumber, amount } = req.body;
    const adminId = req.user._id || req.user.id;

    if (amount <= 0) {
      return res.status(400).json({ error: "Top-up amount must be greater than zero." });
    }

    const card = await Card.findOne({ cardNumber });
    if (!card) {
      return res.status(404).json({ error: "Card not found." });
    }

    card.balance += amount;

    if (!card.isActive && card.balance >= 100) {
      card.isActive = true;
    }

    await card.save();

    const transaction = new Transaction({
      card: card._id,
      user: adminId,
      type: "top_up",
      amount: amount,
      status: "completed",
      description: `Manual top-up by admin ${adminId}`,
    });

    await transaction.save();

    res.status(200).json({ message: "Top-up successful", newBalance: card.balance, isActive: card.isActive });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export const approveUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isApproved } = req.body; // Read the boolean from the frontend

    const user = await User.findByIdAndUpdate(userId, { isApproved }, { returnDocument: "after" });

    res.status(200).json({ message: "User status updated", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
