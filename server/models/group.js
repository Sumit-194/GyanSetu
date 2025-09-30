import mongoose from "mongoose";

const GroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    videos: [
      {
        title: { type: String, default: "" },
        url: { type: String, default: "" },
        publicId: { type: String, default: "" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const Group = mongoose.models.Group || mongoose.model("Group", GroupSchema);
