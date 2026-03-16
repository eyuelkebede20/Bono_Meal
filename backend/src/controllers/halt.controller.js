import HaltRequest from "../models/HaltRequest.js";
import User from "../models/User.js";

// 1. Student Requests Halt
export const requestHalt = async (req, res) => {
  try {
    const { reason, imageUrl } = req.body;
    const userId = req.user?.id || req.user?._id || req.userId || req.user;

    if (!userId) {
      return res.status(400).json({ error: "User ID not found in token payload. Check authMiddleware." });
    }

    const newRequest = await HaltRequest.create({
      user: userId,
      reason,
      imageUrl,
    });
    res.status(201).json(newRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Super Admin Approves
export const adminApprove = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await HaltRequest.findByIdAndUpdate(id, { status: "approved_by_admin" }, { new: true });
    res.status(200).json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Finance Confirms Refund
export const financeRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await HaltRequest.findById(id);

    if (!request) return res.status(404).json({ error: "Request not found" });

    // Mark ticket as refunded
    request.status = "refunded";
    await request.save();

    // Halt the actual user account
    await User.findByIdAndUpdate(request.user, { isApproved: false });

    res.status(200).json({ message: "Refund confirmed and account halted." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. Get Requests (Helper for Dashboards)
export const getRequests = async (req, res) => {
  try {
    const { status } = req.query; // Pass ?status=pending_admin or ?status=approved_by_admin
    const requests = await HaltRequest.find(status ? { status } : {}).populate("user", "firstName lastName phone role");
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
