import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import TopUpRequest from "../models/TopUpRequest.js";
import Attendance from "../models/Attendance.js";
import Card from "../models/Card.js";

export async function getStudentDashboardData(req, res) {
  try {
    const studentId = req.user._id;
    const student = await User.findById(studentId).select("-passwordHash");

    if (!student) return res.status(404).json({ error: "Student not found" });

    const card = await Card.findOne({ owner: studentId });
    const topUpRequests = await TopUpRequest.find({ student: studentId }).sort({ createdAt: -1 });
    const attendance = await Attendance.find({ student: studentId }).sort({ date: -1 });

    let transactions = [];
    let balance = 0;

    if (card) {
      balance = card.balance || 0;
      transactions = await Transaction.find({
        card: card._id,
        type: { $ne: "reversal" },
      }).sort({ createdAt: -1 });
    }

    const uniqueDays = new Set(attendance.map((a) => new Date(a.date).toDateString()));
    const daysEaten = uniqueDays.size;

    res.status(200).json({
      student,
      balance,
      topUpRequests,
      attendance,
      transactions,
      daysEaten,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
