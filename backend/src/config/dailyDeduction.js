import cron from "node-cron";
import mongoose from "mongoose";
import Card from "../models/Card.js";
import Transaction from "../models/Transaction.js";

const DAILY_RATE = 100; // 3000 ETB / 30 days

const runDailyDeduction = () => {
  // Runs every day at 00:00 (Midnight)
  cron.schedule("0 0 * * *", async () => {
    console.log("Running daily deduction job...");
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find all active cards with sufficient balance
      const activeCards = await Card.find({
        isActive: true,
        balance: { $gte: DAILY_RATE },
      }).session(session);

      for (const card of activeCards) {
        // 1. Deduct balance
        card.balance -= DAILY_RATE;
        await card.save({ session });

        // 2. Log transaction
        const transaction = new Transaction({
          card: card._id,
          user: card.owner, // Or a system/admin ID representing the automated process
          type: "daily_deduction",
          amount: DAILY_RATE,
          status: "completed",
          description: "Automated daily mealcard deduction",
        });
        await transaction.save({ session });
      }

      // Optional: Handle cards with insufficient balance (e.g., suspend them)
      const insufficientCards = await Card.find({
        isActive: true,
        balance: { $lt: DAILY_RATE },
      }).session(session);

      for (const card of insufficientCards) {
        card.isActive = false; // Suspend card
        await card.save({ session });
        // You might want to trigger an email/notification here
      }

      await session.commitTransaction();
      console.log(`Daily deduction completed for ${activeCards.length} cards.`);
    } catch (error) {
      await session.abortTransaction();
      console.error("Daily deduction job failed:", error);
    } finally {
      session.endSession();
    }
  });
};

export default runDailyDeduction;
