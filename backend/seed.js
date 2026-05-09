import "dotenv/config";
import { db } from "./src/config/db.js"; // Adjust path if necessary
import { users, cards } from "./src/db/schema.js";
import bcrypt from "bcrypt";

async function runSeed() {
  try {
    const passwordHash = await bcrypt.hash("123456", 10);

    // 1. Create the God Account
    await db
      .insert(users)
      .values({
        firstName: "Super",
        lastName: "Admin",
        phone: "0911000000", // Admin login phone
        password: passwordHash,
        role: "super_admin",
        isApproved: true, // BYPASS: Instantly approved
      })
      .onConflictDoNothing();

    // 2. Create a Dummy Student
    const [student] = await db
      .insert(users)
      .values({
        firstName: "John",
        lastName: "Doe",
        phone: "0922000000",
        password: passwordHash,
        role: "student",
        studentId: "UGR/1234/15",
        isApproved: true,
      })
      .returning();

    // 3. Issue an Active Meal Card for the Student
    await db
      .insert(cards)
      .values({
        ownerId: student.id,
        cardNumber: "TEST-CARD-999",
        balance: "500.00",
        isActive: true,
      })
      .onConflictDoNothing();

    console.log("✅ Seed complete! Admin & Test Card created.");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

runSeed();
