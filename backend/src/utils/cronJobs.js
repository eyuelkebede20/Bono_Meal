import cron from "node-cron";
import { db } from "../config/db.js";
import { users, cards, transactions } from "../db/schema.js";
import { eq, and, gt, sql } from "drizzle-orm";

export const startCronJobs = () => {
  // 1. Monthly Military Allowance (Runs at 00:00 on day 1)
  cron.schedule("0 0 1 * *", async () => {
    try {
      // Find active military students
      const militaryPersonnel = await db
        .select()
        .from(users)
        .innerJoin(cards, eq(users.id, cards.ownerId))
        .where(and(eq(users.role, "military_student"), eq(users.isApproved, true)));

      for (const { users: person, cards: card } of militaryPersonnel) {
        await db.transaction(async (tx) => {
          // Hard reset to 3000 ETB
          await tx.update(cards).set({ balance: "3000.00", isActive: true }).where(eq(cards.id, card.id));

          await tx.insert(transactions).values({
            cardId: card.id,
            userId: person.id,
            type: "allowance_reset", // Using the specific enum we created
            amount: "3000.00",
            description: "Monthly Military Allowance Reset",
            status: "completed",
          });
        });
      }
      console.log("Military monthly allowance distributed.");
    } catch (error) {
      console.error("Monthly Cron Job Error:", error);
    }
  });

  // 2. Daily ETB Deduction (Runs at 00:00 every day)
  cron.schedule("0 0 * * *", async () => {
    try {
      const activeCards = await db
        .select()
        .from(cards)
        .innerJoin(users, eq(cards.ownerId, users.id))
        .where(
          and(
            eq(users.isApproved, true),
            eq(cards.isActive, true),
            gt(cards.balance, "0"), // Only attempt if balance > 0
          ),
        );

      for (const { cards: card, users: person } of activeCards) {
        await db.transaction(async (tx) => {
          // Use DB-level math to prevent race conditions
          const [updatedCard] = await tx
            .update(cards)
            .set({
              balance: sql`${cards.balance} - 100`,
              // Deactivate immediately if it drops to 0 or below
              isActive: sql`${cards.balance} - 100 > 0`,
            })
            .where(eq(cards.id, card.id))
            .returning();

          await tx.insert(transactions).values({
            cardId: card.id,
            userId: person.id,
            type: "daily_deduction",
            amount: "100.00",
            description: "Daily Meal Deduction",
            status: "completed",
          });
        });
      }
      console.log("Daily 100 ETB deduction completed.");
    } catch (error) {
      console.error("Daily Cron Job Error:", error);
    }
  });
};
