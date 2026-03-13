const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["student", "finance_admin", "super_admin"],
      default: "student",
    },
    isApproved: {
      type: Boolean,
      default: false, // Defaults to false to enforce approval
    },
    phone: {
      type: String,
      required: false,
      unique: true,
      trim: true,
    },
    studentId: {
      // Optional: Only for students
      type: String,
      unique: true,
      sparse: true,
    },
    faydaId: {
      // Optional: Only for students
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },
    activeCard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Card",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
