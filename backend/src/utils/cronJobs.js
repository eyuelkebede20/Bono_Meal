// utils/cronJobs.js
import cron from "node-cron";
import User from "../models/Use.js";
import Card from "../models/Car.js";
import Transaction from "../models/Transactio.js";

export const startCronJobs = () => {
  // Runs at 00:00 on day-of-month 1
  cron.schedule("0 0 1 * *", async () => {
    try {
      const militaryPersonnel = await User.find({
        role: { $in: ["military_student", "military_staff"] },
        isApproved: true,
      }).populate("activeCard");

      for (const person of militaryPersonnel) {
        if (!person.activeCard) continue;

        const amount = 3000;

        await Card.findByIdAndUpdate(person.activeCard._id, {
          $inc: { balance: amount },
        });

        await Transaction.create({
          card: person.activeCard._id,
          type: "deposit",
          amount: amount,
          description: "Monthly Military Allowance",
        });
      }
      console.log("Military monthly allowance distributed.");
    } catch (error) {
      console.error("Cron Job Error:", error);
    }
  });
};
