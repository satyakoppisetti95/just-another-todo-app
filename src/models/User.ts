import mongoose, { Schema, models, model } from "mongoose";
import { THEME_IDS } from "@/lib/themes";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  theme?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    theme: {
      type: String,
      enum: [...THEME_IDS],
      // No default — unset means "use client preference" (avoids stomping localStorage with sky)
    },
  },
  { timestamps: true }
);

// Avoid stale cached schema in Next.js HMR (theme field may be missing otherwise)
if (models.User && !models.User.schema.path("theme")) {
  delete models.User;
}

export const User = (models.User as mongoose.Model<IUser>) || model<IUser>("User", UserSchema);
