import { db } from "../config/db.js";
import { users } from "../db/schema.js";
import { eq, count } from "drizzle-orm";

// Toggles user approval status and logs who approved them
export const toggleApproval = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id; // From authMiddleware

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const newApprovalStatus = !user.isApproved;

    const [updatedUser] = await db
      .update(users)
      .set({
        isApproved: newApprovalStatus,
        approvedById: newApprovalStatus ? adminId : null, // Log the admin if approving
      })
      .where(eq(users.id, userId))
      .returning({ id: users.id, isApproved: users.isApproved, firstName: users.firstName });

    res.status(200).json({
      message: `User ${updatedUser.firstName} is now ${updatedUser.isApproved ? "Approved" : "Suspended"}.`,
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getSystemStats = async (req, res) => {
  try {
    const [totalUsers] = await db.select({ value: count() }).from(users);
    const [pendingUsers] = await db.select({ value: count() }).from(users).where(eq(users.isApproved, false));

    res.status(200).json({
      totalUsers: Number(totalUsers.value),
      pendingApprovals: Number(pendingUsers.value),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
