import mongoose from "mongoose";

const blacklistedTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // Automatically deletes the document after 1 day (matches the 1d JWT expiration)
  },
});

export default mongoose.model("BlacklistedToken", blacklistedTokenSchema);
