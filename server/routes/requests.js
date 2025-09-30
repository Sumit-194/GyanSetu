import express from "express";
import jwt from "jsonwebtoken";
import { connectDB } from "../db.js";
import { Request as ReqModel } from "../models/request.js";
import { User } from "../models/user.js";

export const requestsRouter = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_should_be_changed";

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

// Create a teach-me request (student -> teacher)
requestsRouter.post("/", authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const studentId = req.userId;
    const { teacherId } = req.body || {};
    if (!teacherId) return res.status(400).json({ error: "teacherId_required" });

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "teacher") return res.status(404).json({ error: "teacher_not_found" });

    // prevent duplicate pending request
    const existing = await ReqModel.findOne({ studentId, teacherId, status: "pending" });
    if (existing) return res.status(409).json({ error: "request_exists" });

    const request = await ReqModel.create({ studentId, teacherId });

    // notify teacher about new request
    try {
      const { Notification } = await import("../models/notification.js");
      await Notification.create({ userId: teacherId, type: "request_received", payload: { studentId, requestId: request._id.toString() } });
    } catch (e) {
      console.error("Failed to create notification for teacher", e);
    }

    return res.status(201).json({ requestId: request._id.toString(), status: request.status });
  } catch (err) {
    console.error("/api/requests POST error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

// Teacher: list incoming requests
requestsRouter.get("/incoming", authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const teacherId = req.userId;
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "teacher") return res.status(403).json({ error: "not_teacher" });

    const items = await ReqModel.find({ teacherId }).sort({ createdAt: -1 }).limit(200).populate("studentId", "_id name username bio avatarUrl");
    return res.json({ requests: items });
  } catch (err) {
    console.error("/api/requests/incoming error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

// Teacher accepts a request
requestsRouter.post("/:id/accept", authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const teacherId = req.userId;
    const reqId = req.params.id;
    const request = await ReqModel.findById(reqId);
    if (!request) return res.status(404).json({ error: "not_found" });
    if (request.teacherId.toString() !== teacherId) return res.status(403).json({ error: "not_authorized" });
    if (request.status !== "pending") return res.status(400).json({ error: "invalid_status" });

    request.status = "accepted";
    await request.save();

    // notify student that teacher accepted
    try {
      const { Notification } = await import("../models/notification.js");
      await Notification.create({ userId: request.studentId, type: "request_accepted", payload: { teacherId: teacherId, requestId: request._id.toString() } });
    } catch (e) {
      console.error("Failed to create notification", e);
    }

    return res.json({ success: true, requestId: request._id.toString(), status: request.status });
  } catch (err) {
    console.error("/api/requests/:id/accept error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default requestsRouter;
