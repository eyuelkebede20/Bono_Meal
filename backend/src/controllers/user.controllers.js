import express from "express";
import mongoose from "mongoose";
import User from "../models/user.js";
import Card from "../models/card.js";
import Transaction from "../models/transaction.js";
export async function fetchAllUsers(req, res) {
  try {
    const users = await User.find().select("-passwordHash");
    res.status(200).json(users);
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

export async function approveUser(req, res) {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true }).select("-password"); // Exclude password from response

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ message: "User approved successfully", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
