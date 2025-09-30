import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    // For the new local auth flow we store credentials here (passwordHash) and no longer rely on Clerk IDs
    // clerkUserId kept optional for backward compatibility
    clerkUserId: { type: String, default: "", index: true },
    name: { type: String, default: "" },
    email: { type: String, default: "", index: true },
    username: { type: String, default: "", index: true },
    passwordHash: { type: String, default: "" },
    role: { type: String, enum: ["teacher", "student"], default: null },
    bio: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ username: 1 }, { unique: true, sparse: true });

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
