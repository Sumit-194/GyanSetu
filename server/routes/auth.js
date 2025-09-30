import express from "express";
import { connectDB } from "../db.js";
import { User } from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const authRouter = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_should_be_changed";
const SALT_ROUNDS = 10;

// Sign up: create user with credentials (name, username, email, password)
authRouter.post("/signup", async (req, res) => {
  console.debug("[auth] POST /signup received", { body: req.body, time: new Date().toISOString() });
  try {
    await connectDB();
    const { name = "", email = "", username = "", password = "" } = req.body || {};
    if (!email || !password || !username) {
      return res.status(400).json({ error: "email, username and password are required" });
    }

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(409).json({ error: "user_exists" });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ name, email, username, passwordHash: hash });

    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: "30d" });
    return res.status(201).json({ token, mongoUserId: user._id.toString() });
  } catch (err) {
    console.error("/api/auth/signup error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

// Sign in: email or username + password
authRouter.post("/signin", async (req, res) => {
  try {
    await connectDB();
    const { identifier = "", password = "" } = req.body || {};
    if (!identifier || !password) {
      return res.status(400).json({ error: "identifier and password are required" });
    }

    const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "invalid_credentials" });

    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: "30d" });
    return res.json({ token, mongoUserId: user._id.toString() });
  } catch (err) {
    console.error("/api/auth/signin error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

// Middleware to authenticate via Authorization: Bearer <token>
async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || req.query.token || req.headers["x-access-token"];
  if (!auth) return res.status(401).json({ error: "missing_token" });
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "invalid_token" });
  }
}

export { authMiddleware };

// Get current user
authRouter.get("/me", authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const user = await User.findById(req.userId).select("_id name email username role bio avatarUrl");
    if (!user) return res.status(404).json({ error: "not_found" });
    return res.json({ user });
  } catch (err) {
    console.error("/api/auth/me error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

// Update profile (role, bio, avatarUrl)
authRouter.put("/me", authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { role = null, bio = "", avatarUrl = "" } = req.body || {};
    if (!role) return res.status(400).json({ error: "role_required" });
    const user = await User.findByIdAndUpdate(req.userId, { role, bio, avatarUrl }, { new: true }).select("_id");
    if (!user) return res.status(404).json({ error: "not_found" });
    return res.json({ mongoUserId: user._id.toString() });
  } catch (err) {
    console.error("/api/auth/me PUT error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

// Backwards-compatible check-or-create for clerk flow (optional)
authRouter.post("/check-or-create", async (req, res) => {
  try {
    await connectDB();
    const { clerkUserId = "", name = "", email = "", username = "", role = "", bio = "", avatarUrl = "" } = req.body || {};
    if (!clerkUserId) return res.status(400).json({ error: "clerkUserId is required" });
    let user = await User.findOne({ clerkUserId });
    if (user) return res.json({ exists: true, mongoUserId: user._id.toString() });
    if (!role || !bio) return res.status(400).json({ error: "role and bio are required for new users" });
    user = await User.create({ clerkUserId, name, email, username, role, bio, avatarUrl });
    return res.status(201).json({ exists: false, mongoUserId: user._id.toString() });
  } catch (err) {
    console.error("/api/auth/check-or-create error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});
