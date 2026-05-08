import { db } from "../config/db.js";
import { attendance, users, cards } from "../db/schema.js";
import { eq, and, gte, lte, inArray, desc } from "drizzle-orm";

export async function recordAttendance(req, res) {
  try {
    const { phone, mealType } = req.body;
    const guardId = req.user.id; // From authMiddleware

    // 1. Find the student
    const [student] = await db
      .select()
      .from(users)
      .where(and(eq(users.phone, phone), inArray(users.role, ["student", "military_student"])))
      .limit(1);

    if (!student) return res.status(404).json({ error: "Student not found." });

    // 2. Check for an active card
    const [activeCard] = await db
      .select()
      .from(cards)
      .where(and(eq(cards.ownerId, student.id), eq(cards.isActive, true)))
      .limit(1);

    if (!activeCard) {
      return res.status(403).json({ error: "Access Denied: Card is suspended or does not exist." });
    }

    // 3. Prevent double-scanning for the same meal today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [alreadyEaten] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.studentId, student.id), eq(attendance.mealType, mealType), gte(attendance.date, startOfDay), lte(attendance.date, endOfDay)))
      .limit(1);

    if (alreadyEaten) {
      return res.status(400).json({ error: `Student already scanned for ${mealType} today.` });
    }

    // 4. Record Attendance
    await db.insert(attendance).values({
      studentId: student.id,
      mealType,
      scannedById: guardId,
    });

    res.status(200).json({
      message: "Access Granted. Attendance recorded.",
      student: { firstName: student.firstName, lastName: student.lastName, phone: student.phone },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Fetch attendance history for a specific student
export async function getStudentAttendance(req, res) {
  try {
    const { studentId } = req.params;

    // Using explicit Joins to get the guard's name who scanned them
    const history = await db
      .select({
        id: attendance.id,
        date: attendance.date,
        mealType: attendance.mealType,
        scannedBy: {
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(attendance)
      .innerJoin(users, eq(attendance.scannedById, users.id))
      .where(eq(attendance.studentId, studentId))
      .orderBy(desc(attendance.date));

    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
