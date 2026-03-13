import express from "express";

import user from "../models/user.js";
import card from "../models/card.js";

export async function fetchAllUsers(req, res) {
  try {
    const users = await User.find().select("-passwordHash");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
export async function fetchSome(req, res) {
  try {
    // Ensure students can only access their own profile
    if (req.user.role === "student" && req.user.id !== req.params.id) {
      return res.status(403).json({ error: "Access denied." });
    }

    const user = await User.findById(req.params._id).select("-passwordHash").populate("activeCard");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
export async function scanUser(req, res) {}

export async function topUpUser(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { cardNumber, amount } = req.body;
    const adminId = req.user.id; // From auth middleware

    if (amount <= 0) {
      return res.status(400).json({ error: "Top-up amount must be greater than zero." });
    }

    const card = await Card.findOne({ cardNumber }).session(session);
    if (!card) {
      return res.status(404).json({ error: "Card not found." });
    }

    card.balance += amount;

    // If the card was suspended due to insufficient funds, reactivate it if balance covers the daily rate
    if (!card.isActive && card.balance >= 100) {
      card.isActive = true;
    }

    await card.save({ session });

    const transaction = new Transaction({
      card: card._id,
      user: adminId,
      type: "top_up",
      amount: amount,
      status: "completed",
      description: `Manual top-up by admin ${adminId}`,
    });

    await transaction.save({ session });

    await session.commitTransaction();
    res.status(200).json({ message: "Top-up successful", newBalance: card.balance, isActive: card.isActive });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
}
export async function approveUser(req, res) {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true }).select("-password"); // Exclude password from response

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ message: "User approved successfully", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function pendingUser() {
  try {
    const pendingUsers = await User.find({ isApproved: false }).select("-password");
    res.json(pendingUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function registerNewUser() {}
export async function updateExisting() {}
export async function deleteUser() {}
