import mongoose from "mongoose";
import User from "../models/User.js";

import Transaction from "../models/Transaction.js";
import Attendance from "../models/Attendance.js";
import TopUpRequest from "../models/TopUpRequest.js";

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
    const user = await User.findById(userId);

    if (!user) {
      console.log("❌ ERROR: User not found in DB");
      return res.status(404).json({ error: "User not found" });
    }

    const newStatus = !user.isApproved;
    console.log(`--- Processing Approval for ${user.firstName} ---`);
    console.log(`Current Status: ${user.isApproved} -> Target Status: ${newStatus}`);
    console.log(`User Role in DB: "${user.role}"`);

    // 1. Only trigger if we are CHANGING status from false to true
    if (newStatus === true && user.role.toLowerCase().trim() === "military_student") {
      console.log("✅ Military Student detected. Checking for previous bonus...");

      const existingBonus = await TopUpRequest.findOne({
        student: user._id,
        transactionNumber: { $regex: "MIL_BONUS" },
      });

      if (!existingBonus) {
        console.log("🚀 No bonus found. CREATING TopUpRequest now...");

        const bonus = await TopUpRequest.create({
          student: user._id,
          amount: 3000,
          status: "pending",
          transactionNumber: `MIL_BONUS_${Date.now()}_${user._id.toString().slice(-4)}`,
        });

        console.log("✨ SUCCESS: TopUpRequest created with ID:", bonus._id);
      } else {
        console.log("⚠️ Bonus already exists. Skipping to avoid double money.");
      }
    }

    // 2. Update the user status
    user.isApproved = newStatus;
    await user.save();
    console.log("✅ User approval status updated in DB.");

    res.status(200).json({
      message: `User ${newStatus ? "Approved" : "Disapproved"}`,
      user,
    });
  } catch (error) {
    console.error("❌ CRITICAL ERROR in approveUser:", error.message);
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
