import express from "express";
import { connectDB } from "../db.js";
import { Group } from "../models/group.js";
import { User } from "../models/user.js";
import { Request as ReqModel } from "../models/request.js";
import crypto from "crypto";
import https from "https";
import querystring from "querystring";

export const groupsRouter = express.Router();

async function uploadToCloudinaryByUrl(cloudName, apiKey, apiSecret, fileUrl) {
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(toSign).digest("hex");

  const postData = querystring.stringify({
    file: fileUrl,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature,
    resource_type: "video",
  });

  const options = {
    method: "POST",
    hostname: "api.cloudinary.com",
    path: `/v1_1/${cloudName}/video/upload`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(postData),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(parsed.error);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

// Create group
groupsRouter.post("/", async (req, res) => {
  try {
    await connectDB();
    const { name, teacherId } = req.body || {};
    if (!name || !teacherId) return res.status(400).json({ error: "name_teacher_required" });
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "teacher") return res.status(403).json({ error: "not_teacher" });
    const group = await Group.create({ name, teacherId });
    return res.status(201).json({ groupId: group._id.toString(), group });
  } catch (err) {
    console.error("/api/groups POST error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

// Add students to group (only accepted students)
groupsRouter.post("/:id/add-students", async (req, res) => {
  try {
    await connectDB();
    const groupId = req.params.id;
    const { studentIds } = req.body || {};
    if (!Array.isArray(studentIds)) return res.status(400).json({ error: "studentIds_required" });
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "group_not_found" });
    // only allow adding students that have accepted requests with this teacher
    const accepted = await ReqModel.find({ teacherId: group.teacherId, status: "accepted", studentId: { $in: studentIds } }).select("studentId");
    const acceptedIds = accepted.map((a) => a.studentId.toString());
    // merge unique
    const existing = group.studentIds.map((s) => s.toString());
    const toAdd = acceptedIds.filter((id) => !existing.includes(id));
    group.studentIds.push(...toAdd);
    await group.save();

    // notify added students
    try {
      const { Notification } = await import("../models/notification.js");
      for (const sid of toAdd) {
        await Notification.create({ userId: sid, type: "group_added", payload: { groupId: group._id.toString(), groupName: group.name } });
      }
    } catch (e) {
      console.error("Failed to create group notifications", e);
    }

    return res.json({ success: true, added: toAdd, group });
  } catch (err) {
    console.error("/api/groups/:id/add-students error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

// List groups for teacher
groupsRouter.get("/", async (req, res) => {
  try {
    await connectDB();
    const teacherId = req.query.teacherId;
    if (!teacherId) return res.status(400).json({ error: "teacherId_required" });
    const groups = await Group.find({ teacherId }).populate("studentIds", "_id name username avatarUrl");
    return res.json({ groups });
  } catch (err) {
    console.error("/api/groups GET error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

// Upload video to group by providing a remote URL; server will instruct Cloudinary to fetch it
groupsRouter.post("/:id/videos", async (req, res) => {
  try {
    await connectDB();
    const groupId = req.params.id;
    const { fileUrl, fileData, title } = req.body || {};
    if (!fileUrl && !fileData) return res.status(400).json({ error: "fileUrl_or_fileData_required" });
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "group_not_found" });
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) return res.status(500).json({ error: "cloudinary_not_configured" });

    const toSend = fileData || fileUrl;
    // Cloudinary accepts data URLs (data:<mime>;base64,...) as the `file` parameter
    const uploaded = await uploadToCloudinaryByUrl(cloudName, apiKey, apiSecret, toSend);
    const video = { title: title || "", url: uploaded.secure_url || uploaded.url, publicId: uploaded.public_id || "" };
    group.videos.push(video);
    await group.save();

    // notify group students about new video
    try {
      const { Notification } = await import("../models/notification.js");
      const studentIds = (group.studentIds || []).map((s) => (typeof s === 'object' ? s.toString() : s));
      for (const sid of studentIds) {
        await Notification.create({ userId: sid, type: "video_uploaded", payload: { groupId: group._id.toString(), groupName: group.name, video } });
      }
    } catch (e) {
      console.error("Failed to create video notifications", e);
    }

    return res.json({ success: true, video, uploaded });
  } catch (err) {
    console.error("/api/groups/:id/videos error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default groupsRouter;
