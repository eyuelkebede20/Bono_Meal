import Attendance from "../models/Attendance.js";
import User from "../models/Use.js";
import Card from "../models/Car.js";

export async function recordAttendance(req, res) {
  try {
    const { phone, mealType } = req.body;
    const guardId = req.user._id;

    const student = await User.findOne({ phone, role: { $in: ["student", "military_student"] } }).populate("activeCard");
    if (!student) return res.status(404).json({ error: "Student not found." });

    if (!student.activeCard || !student.activeCard.isActive) {
      return res.status(403).json({ error: "Access Denied: Card is suspended or inactive." });
    }

    // Prevent double-scanning for the same meal today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const alreadyEaten = await Attendance.findOne({
      student: student._id,
      mealType,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (alreadyEaten) {
      return res.status(400).json({ error: `Student already scanned for ${mealType} today.` });
    }

    const record = new Attendance({
      student: student._id,
      mealType,
      scannedBy: guardId,
    });

    await record.save();

    res.status(200).json({
      message: "Access Granted. Attendance recorded.",
      student: { firstName: student.firstName, lastName: student.lastName, phone: student.phone },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Fetch attendance history for a specific student (For Super Admin clicking a name)
export async function getStudentAttendance(req, res) {
  try {
    const { studentId } = req.params;
    const history = await Attendance.find({ student: studentId }).populate("scannedBy", "firstName lastName").sort({ date: -1 });

    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
