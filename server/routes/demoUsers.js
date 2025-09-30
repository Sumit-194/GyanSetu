import express from "express";
import { connectDB } from "../db.js";
import { User } from "../models/user.js";
import bcrypt from "bcryptjs";

const router = express.Router();

// This route creates demo teacher and student accounts for local/dev testing.
// Only enabled when NODE_ENV !== 'production' or ALLOW_DEMO env var is set.
router.post("/create-sample-users", async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production" && !process.env.ALLOW_DEMO) {
      return res.status(403).json({ error: "demo_disabled" });
    }
    await connectDB();
    const teacherIdentifier = "teacher@teacher.teacher";
    const studentIdentifier = "student@student.student";
    const teacherPass = "teacher";
    const studentPass = "student";

    // create teacher if not exists
    let teacher = await User.findOne({ $or: [{ email: teacherIdentifier }, { username: "teacher" }] });
    if (!teacher) {
      const hash = await bcrypt.hash(teacherPass, 10);
      teacher = await User.create({ name: "Teacher", email: teacherIdentifier, username: "teacher", passwordHash: hash, role: "teacher", bio: "I am teacher" });
    }

    // create student if not exists
    let student = await User.findOne({ $or: [{ email: studentIdentifier }, { username: "student" }] });
    if (!student) {
      const hash = await bcrypt.hash(studentPass, 10);
      student = await User.create({ name: "Student", email: studentIdentifier, username: "student", passwordHash: hash, role: "student", bio: "I am student" });
    }

    return res.json({ teacher: { identifier: teacherIdentifier, password: teacherPass, mongoUserId: teacher._id.toString() }, student: { identifier: studentIdentifier, password: studentPass, mongoUserId: student._id.toString() } });
  } catch (err) {
    console.error("/api/demo/create-sample-users error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
