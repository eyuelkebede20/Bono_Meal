import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    card: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Card",
      required: true,
    },
    user: {
      // The user who performed the transaction (could be admin for manual adjustments)
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["top_up", "meal_purchase", "manual_adjustment", "refund", "daily_deduction", "reversal", "deposit", "meal_deduction"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    referenceId: {
      // ID from the external payment gateway
      type: String,
      sparse: true,
    },
    description: {
      type: String,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Transaction", transactionSchema);
