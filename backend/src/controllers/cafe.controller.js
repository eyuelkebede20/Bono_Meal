import { db } from "../config/db.js";
import { users, attendance } from "../db/schema.js";
import { eq, inArray, and, gte, lt, count } from "drizzle-orm";

export const getCafeLordStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 1. Get active users
    const [activeUsersResult] = await db.select({ value: count() }).from(users).where(eq(users.isApproved, true));

    const activeUsers = Number(activeUsersResult.value);

    // 2. Get registration stats (Optimized to a single GROUP BY query)
    const targetRoles = ["student", "military_student", "military_staff", "finance_admin"];
    const roleCounts = await db
      .select({
        role: users.role,
        count: count(),
      })
      .from(users)
      .where(inArray(users.role, targetRoles))
      .groupBy(users.role);

    // Map to ensure all target roles exist in the output even if count is 0
    const registrationStats = targetRoles.map((role) => {
      const found = roleCounts.find((r) => r.role === role);
      return { role, count: found ? Number(found.count) : 0 };
    });

    // 3. Helper to get meal stats (Optimized to use the database mealType enum)
    const getMealStats = async (dateGte, dateLt) => {
      const mealCounts = await db
        .select({
          mealType: attendance.mealType,
          count: count(),
        })
        .from(attendance)
        .where(and(gte(attendance.createdAt, dateGte), lt(attendance.createdAt, dateLt)))
        .groupBy(attendance.mealType);

      // Format to match old output
      const stats = { breakfast: 0, lunch: 0, dinner: 0 };
      mealCounts.forEach((row) => {
        if (stats[row.mealType] !== undefined) {
          stats[row.mealType] = Number(row.count);
        }
      });
      return stats;
    };

    // Run today and yesterday queries concurrently
    const [todayMeals, yesterdayMeals] = await Promise.all([getMealStats(today, new Date()), getMealStats(yesterday, today)]);

    res.status(200).json({
      activeUsers,
      registrationStats,
      todayMeals,
      yesterdayMeals,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
