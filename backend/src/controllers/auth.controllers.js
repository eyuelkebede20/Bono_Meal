import bcrypt from "bcrypt";
import crypto from "crypto";
import User from "../models/user.js";
import Card from "../models/card.js";
import jwt from "jsonwebtoken";
import BlacklistedToken from "../models/BlacklistedToken.js";
export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) return res.status(400).json({ error: "Invalid credentials" });

    // Check approval status before issuing token
    if (!user.isApproved) {
      return res.status(403).json({ error: "Your account is pending Super Admin approval." });
    }

    const token = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, role: user.role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
export async function logout(req, res) {
  try {
    const authHeader = req.header("Authorization");

    // Check if the header exists before trying to replace
    if (!authHeader) {
      return res.status(400).json({ error: "Authorization header missing" });
    }

    const token = authHeader.replace("Bearer ", "");

    const blacklistedToken = new BlacklistedToken({ token });
    await blacklistedToken.save();

    res.status(200).json({ message: "Successfully logged out on the server." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
export async function signup(req, res) {
  try {
    // 1. Destructure all fields expected from the frontend, including phone
    const { firstName, lastName, email, password, role, studentId, faydaId, phone } = req.body;

    // 2. Block public super_admin creation entirely
    if (role === "super_admin") {
      return res.status(403).json({ error: "Cannot register as super_admin publicly." });
    }

    // 3. Enforce roles. Fallback to student if something weird is sent.
    const assignedRole = role === "finance_admin" ? "finance_admin" : "student";

    // 4. Auto-approve students, require approval for finance_admin
    const isApproved = assignedRole === "student" ? true : false;

    // 5. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 6. Map the fields EXACTLY as they are named in your User schema
    const newUser = new User({
      firstName,
      lastName,
      email,
      passwordHash: hashedPassword, // FIX: Matches your schema's 'passwordHash'
      role: assignedRole,
      phone, // FIX: Added phone since your schema requires it
      // Only attach studentId and faydaId if the user is a student
      studentId: assignedRole === "student" ? studentId : undefined,
      faydaId: assignedRole === "student" ? faydaId : undefined, // FIX: Assign faydaId correctly
      isApproved,
    });

    const savedUser = await newUser.save();

    // 7. Generate card if student
    if (savedUser.role === "student") {
      const newCard = new Card({
        // If faydaId wasn't provided for some reason, fallback to random
        cardNumber: faydaId || Math.random().toString().slice(2, 18),
        owner: savedUser._id,
      });
      const savedCard = await newCard.save();
      savedUser.activeCard = savedCard._id;
      await savedUser.save();
    }

    res.status(201).json({
      message: assignedRole === "finance_admin" ? "Registration successful. Please wait for Super Admin approval." : "Registration successful. You can now log in.",
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
