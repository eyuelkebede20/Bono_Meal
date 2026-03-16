import mongoose from "mongoose";

const haltRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true },
    imageUrl: { type: String, required: true }, // Store base64 or Cloudinary/Multer URL
    status: {
      type: String,
      enum: ["pending_admin", "approved_by_admin", "rejected", "refunded"],
      default: "pending_admin",
    },
  },
  { timestamps: true },
);

export default mongoose.model("HaltRequest", haltRequestSchema);
