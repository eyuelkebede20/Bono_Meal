import TopUpRequest from "../models/TopUpRequest.js";
import Card from "../models/Car.js";
import Transaction from "../models/Transactio.js";
import User from "../models/Use.js";

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
    if (!request) return res.status(404).json({ error: "Top-up request not found." });
    if (request.status !== "pending") return res.status(400).json({ error: "This request has already been processed." });

    const targetUserId = request.student || request.user;
    let card = await Card.findOne({ owner: targetUserId });

    if (!card) {
      card = await Card.create({
        owner: targetUserId,
        cardNumber: `STU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        balance: 0,
        isActive: true,
      });

      // CRITICAL: Link the newly created card to the User profile
      await User.findByIdAndUpdate(targetUserId, { activeCard: card._id });
    }

    // Force number conversion to prevent string concatenation
    const depositAmount = Number(request.amount);

    card.balance += depositAmount;
    if (!card.isActive && card.balance >= 100) card.isActive = true;
    await card.save();

    request.status = "approved";
    request.handledBy = adminId;
    await request.save();

    const transaction = new Transaction({
      card: card._id,
      user: targetUserId,
      handledBy: adminId,
      type: "deposit", // Ensure this matches your Enum (deposit vs top_up)
      amount: depositAmount,
      status: "completed",
      description: `Bank transfer approved. Ref: ${request.transactionNumber}`,
    });
    await transaction.save();

    res.status(200).json({ message: "Top-up approved.", newBalance: card.balance });
  } catch (error) {
    console.error("Approval Error:", error);
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

export async function searchApprovedRequests(req, res) {
  try {
    const { q } = req.query;
    if (!q) return res.status(200).json([]);

    const students = await User.find({
      $or: [{ firstName: { $regex: q, $options: "i" } }, { lastName: { $regex: q, $options: "i" } }, { phone: { $regex: q, $options: "i" } }],
    }).select("_id");

    const studentIds = students.map((s) => s._id);

    const approvedRequests = await TopUpRequest.find({
      student: { $in: studentIds },
      status: "approved",
    })
      .populate("student", "firstName lastName phone")
      .sort({ updatedAt: -1 })
      .limit(10);

    res.status(200).json(approvedRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
