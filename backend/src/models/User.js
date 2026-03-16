import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true, unique: true }, // Main login identifier
    role: {
      type: String,
      enum: ["finance_admin", "security_guard", "super_admin", "student", "military_student", "military_staff"],
      default: "student",
      required: true,
    },
    password: { type: String },
    studentId: { type: String }, // Optional depending on role
    faydaId: { type: String }, // Optional
    telegramChatId: { type: String, default: null },
    isApproved: { type: Boolean, default: false },
    activeCard: { type: mongoose.Schema.Types.ObjectId, ref: "Card" },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
