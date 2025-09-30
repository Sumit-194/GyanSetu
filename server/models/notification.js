import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true },
    payload: { type: Object, default: {} },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
