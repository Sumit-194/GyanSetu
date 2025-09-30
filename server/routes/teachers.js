import express from "express";
import { connectDB } from "../db.js";
import { User } from "../models/user.js";

export const teachersRouter = express.Router();

// Search teachers by name, username or bio
teachersRouter.get("/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const limit = Math.min(parseInt(req.query.limit || "20", 10) || 20, 100);
  try {
    await connectDB();
    if (!q) return res.json({ teachers: [] });
    // escape regex chars
    const esc = q.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&");
    const regex = new RegExp(esc, "i");
    const teachers = await User.find({
      role: "teacher",
      $or: [{ name: regex }, { username: regex }, { bio: regex }],
    })
      .limit(limit)
      .select("_id name username bio avatarUrl");
    return res.json({ teachers });
  } catch (err) {
    console.error("/api/teachers/search error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

// Get teacher by id
teachersRouter.get("/:id", async (req, res) => {
  try {
    await connectDB();
    const teacher = await User.findById(req.params.id).select("_id name username bio avatarUrl");
    if (!teacher) return res.status(404).json({ error: "not_found" });
    return res.json({ teacher });
  } catch (err) {
    console.error("/api/teachers/:id error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});
