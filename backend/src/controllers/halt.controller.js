import { db } from "../config/db.js";
import { haltRequests, cards, transactions, users } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

export async function requestHalt(req, res) {
  try {
    const { reason, imageUrl } = req.body;
    const userId = req.user.id;

    await db.insert(haltRequests).values({
      userId,
      reason,
      imageUrl,
      status: "pending_admin",
    });

    res.status(201).json({ message: "Halt requested successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getRequests(req, res) {
  try {
    const requests = await db.query.haltRequests.findMany({
      orderBy: [desc(haltRequests.createdAt)],
      with: {
        user: { columns: { firstName: true, lastName: true, phone: true } },
      },
    });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function adminApprove(req, res) {
  try {
    const { id } = req.params;
    const [updated] = await db.update(haltRequests).set({ status: "approved_by_admin" }).where(eq(haltRequests.id, id)).returning();

    if (!updated) return res.status(404).json({ error: "Request not found." });
    res.status(200).json({ message: "Approved by Admin. Pending Finance refund." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function financeRefund(req, res) {
  try {
    const { id } = req.params;
    const financeId = req.user.id;

    await db.transaction(async (tx) => {
      const [request] = await tx.select().from(haltRequests).where(eq(haltRequests.id, id)).limit(1);

      if (!request) throw new Error("Request not found");
      if (request.status !== "approved_by_admin") throw new Error("Request must be approved by Super Admin first.");

      const [card] = await tx.select().from(cards).where(eq(cards.ownerId, request.userId)).limit(1);
      if (!card) throw new Error("Card not found");

      // 1. Zero out card and suspend
      await tx.update(cards).set({ balance: "0", isActive: false }).where(eq(cards.id, card.id));

      // 2. Mark refunded
      await tx.update(haltRequests).set({ status: "refunded" }).where(eq(haltRequests.id, id));

      // 3. Log refund transaction
      if (Number(card.balance) > 0) {
        await tx.insert(transactions).values({
          cardId: card.id,
          userId: request.userId,
          approvedById: financeId,
          type: "refund",
          amount: card.balance,
          status: "completed",
          description: `Account halted. Remaining balance refunded.`,
        });
      }

      res.status(200).json({ message: "Refund processed and card halted." });
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
