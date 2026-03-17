import cron from "node-cron";
import User from "../models/User.js";
import Card from "../models/Card.js";
import Transaction from "../models/Transaction.js";

export const startCronJobs = () => {
  // 1. Monthly Military Allowance (Runs at 00:00 on day 1)
  cron.schedule("0 0 1 * *", async () => {
    try {
      const militaryPersonnel = await User.find({
        role: { $in: ["military_student"] },
        isApproved: true,
      }).populate("activeCard");

      for (const person of militaryPersonnel) {
        if (!person.activeCard) continue;

        const amount = 3000;

        await Card.findByIdAndUpdate(person.activeCard._id, {
          $inc: { balance: amount },
          isActive: true, // Reactivate if it was previously 0
        });

        await Transaction.create({
          card: person.activeCard._id,
          type: "deposit",
          amount: amount,
          description: "Monthly Military Allowance!",
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
      const allUsers = await User.find({ isApproved: true }).populate("activeCard");

      for (const person of allUsers) {
        if (!person.activeCard) continue;

        const currentBalance = person.activeCard.balance;

        // Skip deduction if balance is already 0 or below, ensure card is inactive
        if (currentBalance <= 0) {
          if (person.activeCard.isActive !== false) {
            await Card.findByIdAndUpdate(person.activeCard._id, { isActive: false });
          }
          continue;
        }

        const newBalance = currentBalance - 100;
        const updateFields = { balance: newBalance };

        // Deactivate card if the new balance hits 0 or drops below
        if (newBalance <= 0) {
          updateFields.isActive = false;
        }

        await Card.findByIdAndUpdate(person.activeCard._id, updateFields);

        await Transaction.create({
          card: person.activeCard._id,
          type: "deduction",
          amount: 100,
          description: "Daily Meal Deduction",
        });
      }
      console.log("Daily 100 ETB deduction completed.");
    } catch (error) {
      console.error("Daily Cron Job Error:", error);
    }
  });
};
