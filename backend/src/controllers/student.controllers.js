import { db } from "../config/db.js";
import { users, cards, transactions, topUpRequests, attendance } from "../db/schema.js";
import { eq, ne, and, desc } from "drizzle-orm";

export async function getStudentDashboardData(req, res) {
  try {
    const studentId = req.user.id;

    // Fetch student explicitly excluding the password
    const [student] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        role: users.role,
        studentId: users.studentId,
        faydaId: users.faydaId,
        telegramChatId: users.telegramChatId,
        isApproved: users.isApproved,
        mealPlanType: users.mealPlanType,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, studentId))
      .limit(1);

    if (!student) return res.status(404).json({ error: "Student not found" });

    // Run independent queries concurrently
    const [[card], userTopUpRequests, userAttendance] = await Promise.all([
      db.select().from(cards).where(eq(cards.ownerId, studentId)).limit(1),
      db.select().from(topUpRequests).where(eq(topUpRequests.studentId, studentId)).orderBy(desc(topUpRequests.createdAt)),
      db.select().from(attendance).where(eq(attendance.studentId, studentId)).orderBy(desc(attendance.date)),
    ]);

    let userTransactions = [];
    let balance = "0.00"; // Note: Numeric types return as strings in Postgres to prevent precision loss

    if (card) {
      balance = card.balance;

      userTransactions = await db
        .select()
        .from(transactions)
        .where(and(eq(transactions.cardId, card.id), ne(transactions.type, "reversal")))
        .orderBy(desc(transactions.createdAt));
    }

    const uniqueDays = new Set(userAttendance.map((a) => new Date(a.date).toDateString()));
    const daysEaten = uniqueDays.size;

    res.status(200).json({
      student,
      balance,
      topUpRequests: userTopUpRequests,
      attendance: userAttendance,
      transactions: userTransactions,
      daysEaten,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
