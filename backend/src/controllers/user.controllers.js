import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Card from "../models/Card.js";
import Transaction from "../models/Transaction.js";
export async function fetchAllUsers(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const roleFilter = req.query.role; // Optional: filter by role

    const query = {};

    if (roleFilter) {
      query.role = roleFilter;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const users = await User.find(query).select("-passwordHash").populate("activeCard").skip(skip).limit(limit).sort({ createdAt: -1 });

    const totalUsers = await User.countDocuments(query);

    res.status(200).json({
      users,
      pagination: {
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: page,
        pageSize: limit,
      },
    });
  } catch (error) {
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
export async function fetchSome(req, res) {
  try {
    const userId = req.params.id;

    // Check if the ID is a valid MongoDB ObjectId to prevent casting errors
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid User ID format" });
    }

    const user = await User.findById(userId).select("passwordHash").populate("activeCard");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("FetchSome Error:", error); // This prints to your terminal
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
