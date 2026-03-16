import mongoose from "mongoose";
//The card's unique identifier, current balance, active status, and a reference back to the owner.

const cardSchema = new mongoose.Schema(
  {
    cardNumber: {
      // Unique identifier for scanning (QR/Barcode)
      type: String,
      required: true,
      unique: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0, // Prevents negative balances
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Card", cardSchema);
