import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, default: Date.now },
    mealType: { type: String, enum: ["breakfast", "lunch", "dinner"], required: true },
    scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // The security guard
  },
  { timestamps: true },
);

export default mongoose.model("Attendance", attendanceSchema);
