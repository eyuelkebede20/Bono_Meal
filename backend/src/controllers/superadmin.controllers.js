import User from "../models/User.js";
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
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, { isApproved: true }, { new: true });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.status(200).json({ message: "User approved successfully", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
