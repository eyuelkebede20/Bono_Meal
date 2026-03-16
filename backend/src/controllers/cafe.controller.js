import User from "../models/User.js";
import Attendance from "../models/Attendance.js";

export const getCafeLordStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const activeUsers = await User.countDocuments({ isApproved: true });

    const roles = ["student", "military_student", "military_staff", "finance_admin"];
    const registrationStats = await Promise.all(
      roles.map(async (role) => {
        const count = await User.countDocuments({ role });
        return { role, count };
      }),
    );

    const getMealStats = async (dateGte, dateLt) => {
      const attendance = await Attendance.find({
        createdAt: { $gte: dateGte, $lt: dateLt },
      });

      return {
        breakfast: attendance.filter((a) => {
          const h = new Date(a.createdAt).getHours();
          return h >= 6 && h < 10;
        }).length,
        lunch: attendance.filter((a) => {
          const h = new Date(a.createdAt).getHours();
          return h >= 11 && h < 15;
        }).length,
        dinner: attendance.filter((a) => {
          const h = new Date(a.createdAt).getHours();
          return h >= 18 && h < 22;
        }).length,
      };
    };

    const todayMeals = await getMealStats(today, new Date());
    const yesterdayMeals = await getMealStats(yesterday, today);

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
