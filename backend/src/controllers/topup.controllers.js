import TopUpRequest from "../models/TopUpRequest.js";
import Card from "../models/Card.js";
import Transaction from "../models/Transaction.js";

// Student submits bank transfer details
export async function submitRequest(req, res) {
  try {
    const { transactionNumber, amount } = req.body;
    const studentId = req.user._id;

    const exists = await TopUpRequest.findOne({ transactionNumber });
    if (exists) return res.status(400).json({ error: "Transaction number already submitted." });

    const request = new TopUpRequest({ student: studentId, transactionNumber, amount });
    await request.save();

    res.status(201).json({ message: "Top-up request submitted." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Finance views pending requests
export async function getPendingRequests(req, res) {
  try {
    const requests = await TopUpRequest.find({ status: "pending" }).populate("student", "firstName lastName phone studentId");
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Finance approves request (Item 2)
export async function approveRequest(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user._id;

    const request = await TopUpRequest.findById(id);
    if (!request || request.status !== "pending") return res.status(400).json({ error: "Invalid or already processed request." });

    const card = await Card.findOne({ owner: request.student });
    if (!card) return res.status(404).json({ error: "Student card not found." });

    request.status = "approved";
    request.handledBy = adminId;
    await request.save();

    card.balance += request.amount;
    if (!card.isActive && card.balance >= 100) card.isActive = true;
    await card.save();

    const transaction = new Transaction({
      card: card._id,
      user: adminId,
      type: "top_up",
      amount: request.amount,
      status: "completed",
      description: `Bank transfer approved. Ref: ${request.transactionNumber}`,
    });
    await transaction.save();

    res.status(200).json({ message: "Top-up approved.", newBalance: card.balance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Finance reverts a mistaken approval (Item 6)
export async function revertRequest(req, res) {
  try {
    const { id } = req.params;

    const request = await TopUpRequest.findById(id);
    if (!request || request.status !== "approved") return res.status(400).json({ error: "Can only revert approved requests." });

    const card = await Card.findOne({ owner: request.student });
    if (!card) return res.status(404).json({ error: "Student card not found." });

    // Deduct the money back
    card.balance -= request.amount;
    if (card.balance < 0) card.balance = 0; // Prevent negative balance
    await card.save();

    request.status = "reverted";
    await request.save();

    // Create a reversal transaction log
    const transaction = new Transaction({
      card: card._id,
      user: req.user._id,
      type: "reversal",
      amount: -request.amount,
      status: "completed",
      description: `Reverted bank transfer. Ref: ${request.transactionNumber}`,
    });
    await transaction.save();

    res.status(200).json({ message: "Top-up reverted successfully.", newBalance: card.balance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
