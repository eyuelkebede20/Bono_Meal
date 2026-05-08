import { db } from "../config/db.js";
import { topUpRequests, cards, transactions, users } from "../db/schema.js";
import { eq, or, ilike, desc } from "drizzle-orm";

export async function submitRequest(req, res) {
  try {
    const { transactionNumber, amount, receiptImageUrl } = req.body;
    const studentId = req.user.id;

    // Optional: You could check if transactionNumber exists first, but unique constraint on schema handles it
    await db.insert(topUpRequests).values({
      studentId,
      transactionNumber,
      amount: amount.toString(), // numeric requires string in drizzle
      receiptImageUrl, // Added this field per schema update
      status: "pending",
    });

    res.status(201).json({ message: "Top-up request submitted." });
  } catch (error) {
    if (error.code === "23505") return res.status(400).json({ error: "Transaction number already submitted." });
    res.status(500).json({ error: error.message });
  }
}

export async function getPendingRequests(req, res) {
  try {
    const requests = await db.query.topUpRequests.findMany({
      where: eq(topUpRequests.status, "pending"),
      with: {
        student: {
          columns: { firstName: true, lastName: true, phone: true, studentId: true },
        },
      },
    });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function approveRequest(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    await db.transaction(async (tx) => {
      const [request] = await tx.select().from(topUpRequests).where(eq(topUpRequests.id, id)).limit(1);

      if (!request) throw new Error("Top-up request not found.");
      if (request.status !== "pending") throw new Error("This request has already been processed.");

      let [card] = await tx.select().from(cards).where(eq(cards.ownerId, request.studentId)).limit(1);

      if (!card) {
        [card] = await tx
          .insert(cards)
          .values({
            ownerId: request.studentId,
            cardNumber: `STU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            balance: "0",
            isActive: true,
          })
          .returning();
      }

      // 1. Update Card Balance using DB-level math
      const [updatedCard] = await tx
        .update(cards)
        .set({
          balance: sql`${cards.balance} + ${request.amount}`,
          isActive: sql`(${cards.balance} + ${request.amount}) >= 100`, // Activate if enough funds
        })
        .where(eq(cards.id, card.id))
        .returning();

      // 2. Mark request as approved
      await tx.update(topUpRequests).set({ status: "approved", handledById: adminId }).where(eq(topUpRequests.id, id));

      // 3. Log transaction
      await tx.insert(transactions).values({
        cardId: card.id,
        userId: request.studentId,
        approvedById: adminId,
        type: "top_up",
        amount: request.amount,
        status: "completed",
        description: `Bank transfer approved. Ref: ${request.transactionNumber}`,
      });

      res.status(200).json({ message: "Top-up approved.", newBalance: updatedCard.balance });
    });
  } catch (error) {
    res.status(error.message.includes("not found") ? 404 : 400).json({ error: error.message });
  }
}

export async function revertRequest(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    await db.transaction(async (tx) => {
      const [request] = await tx.select().from(topUpRequests).where(eq(topUpRequests.id, id)).limit(1);
      if (!request || request.status !== "approved") throw new Error("Can only revert approved requests.");

      const [card] = await tx.select().from(cards).where(eq(cards.ownerId, request.studentId)).limit(1);
      if (!card) throw new Error("Student card not found.");

      // Deduct balance, ensure it doesn't go below zero
      const [updatedCard] = await tx
        .update(cards)
        .set({
          balance: sql`GREATEST(${cards.balance} - ${request.amount}, 0)`,
          isActive: sql`(GREATEST(${cards.balance} - ${request.amount}, 0)) >= 100`,
        })
        .where(eq(cards.id, card.id))
        .returning();

      await tx.update(topUpRequests).set({ status: "reverted" }).where(eq(topUpRequests.id, id));

      await tx.insert(transactions).values({
        cardId: card.id,
        userId: adminId,
        type: "reversal",
        amount: request.amount,
        status: "completed",
        description: `Reverted bank transfer. Ref: ${request.transactionNumber}`,
      });

      res.status(200).json({ message: "Top-up reverted successfully.", newBalance: updatedCard.balance });
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function searchApprovedRequests(req, res) {
  try {
    const { q } = req.query;
    if (!q) return res.status(200).json([]);

    // Drizzle innerJoin to search by user name/phone and return topUpRequests
    const results = await db
      .select({
        request: topUpRequests,
        student: { firstName: users.firstName, lastName: users.lastName, phone: users.phone },
      })
      .from(topUpRequests)
      .innerJoin(users, eq(topUpRequests.studentId, users.id))
      .where(and(eq(topUpRequests.status, "approved"), or(ilike(users.firstName, `%${q}%`), ilike(users.lastName, `%${q}%`), ilike(users.phone, `%${q}%`))))
      .orderBy(desc(topUpRequests.updatedAt))
      .limit(10);

    // Format to match old Mongoose populate structure
    const formatted = results.map((row) => ({ ...row.request, student: row.student }));
    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
