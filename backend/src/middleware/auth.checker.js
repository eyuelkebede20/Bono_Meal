import jwt from "jsonwebtoken";
import BlacklistedToken from "../models/BlacklistedToken.js";

// 1. Authentication Middleware (with Blacklist check)
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided. Access denied." });
    }

    const token = authHeader.replace("Bearer ", "");

    // Check if token is in the blacklist (Logout check)
    const isBlacklisted = await BlacklistedToken.findOne({ token });
    if (isBlacklisted) {
      return res.status(401).json({ error: "Token invalidated. Please log in again." });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user payload (id, role, etc.) to request
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token. Please authenticate." });
  }
};

// 2. Role Authorization Middleware
// Use it like: roleMiddleware(['admin', 'guard'])
const roleMiddleware = (roles) => {
  return (req, res, next) => {
    // Ensure authMiddleware has already run and attached req.user
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Insufficient permissions." });
    }
    next();
  };
};

export { authMiddleware, roleMiddleware };
