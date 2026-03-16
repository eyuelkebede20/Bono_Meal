import User from "../models/User.js";
import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import Attendance from "../models/Attendance.js";

export const getSystemStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const totalStudents = await User.countDocuments({
      role: { $in: ["student", "military_student"] },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eatingToday = await Attendance.aggregate([{ $match: { date: { $gte: today } } }, { $group: { _id: "$student" } }]);

    const thisMonthMoney = await Transaction.aggregate([{ $match: { type: "deposit", createdAt: { $gte: startOfThisMonth } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);

    const lastMonthMoney = await Transaction.aggregate([
      { $match: { type: "deposit", createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.status(200).json({
      totalStudents,
      eatingToday: eatingToday.length,
      thisMonthTotal: thisMonthMoney[0]?.total || 0,
      lastMonthTotal: lastMonthMoney[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const approveUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate if it's a valid MongoDB ObjectId first
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid User ID format" });
    }

    const user = await User.findById(userId);

    if (!user) {
      console.log(`User ID ${userId} not found in DB`);
      return res.status(404).json({ error: "User not found in database." });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, { $set: { isApproved: !user.isApproved } }, { returnDocument: "after" });

    res.status(200).json({
      message: `User ${updatedUser.isApproved ? "Approved" : "Disapproved"}`,
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const toggleApproval = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Flip the status
    user.isApproved = !user.isApproved;

    // Save bypassing strict validation for shell accounts
    await User.findByIdAndUpdate(userId, { isApproved: user.isApproved });

    res.status(200).json({
      message: `User is now ${user.isApproved ? "Approved" : "Disapproved"}`,
      isApproved: user.isApproved,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
