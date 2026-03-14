import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import TopUpRequest from "../models/TopUpRequest.js";
import Attendance from "../models/Attendance.js";

export async function getStudentDashboardData(req, res) {
  try {
    const studentId = req.user._id;
    const student = await User.findById(studentId).select("-passwordHash").populate("activeCard");

    if (!student) return res.status(404).json({ error: "Student not found" });

    // Top-up requests show pending/approved/reverted statuses
    const topUpRequests = await TopUpRequest.find({ student: studentId }).sort({ createdAt: -1 });
    const attendance = await Attendance.find({ student: studentId }).sort({ date: -1 });

    let transactions = [];
    let balance = 0;

    if (student.activeCard) {
      balance = student.activeCard.balance || 0;

      // Fetch transactions but exclude "reversal" so it doesn't clutter the student's list
      transactions = await Transaction.find({
        card: student.activeCard._id,
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
