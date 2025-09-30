import express from "express";
import { connectDB } from "../db.js";
import { Notification } from "../models/notification.js";
import { User } from "../models/user.js";
import { authMiddleware } from "./auth.js";

const router = express.Router();

// Get notifications for current user
router.get("/", authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const items = await Notification.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(200);
    return res.json({ notifications: items });
  } catch (err) {
    console.error("/api/notifications GET error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

// Mark notification as read
router.post("/:id/read", authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const n = await Notification.findById(req.params.id);
    if (!n) return res.status(404).json({ error: "not_found" });
    if (n.userId.toString() !== req.userId) return res.status(403).json({ error: "not_authorized" });
    n.read = true;
    await n.save();
    return res.json({ success: true });
  } catch (err) {
    console.error("/api/notifications/:id/read error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
