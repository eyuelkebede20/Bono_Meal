import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true, unique: true }, // Main login identifier
    role: {
      type: String,
      enum: ["super_admin", "finance_admin", "student", "security_guard"],
      default: "student",
    },
    studentId: { type: String }, // Optional depending on role
    faydaId: { type: String }, // Optional
    isApproved: { type: Boolean, default: false },
    activeCard: { type: mongoose.Schema.Types.ObjectId, ref: "Card" },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
