import mongoose, { Schema, models, model } from "mongoose";
import { FOLDER_COLORS } from "@/lib/constants";

export { FOLDER_COLORS };

export interface IFolder {
  _id: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  name: string;
  color: string;
  icon: string;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FolderSchema = new Schema<IFolder>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    color: { type: String, default: "#007AFF" },
    icon: { type: String, default: "list" },
    isPrivate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Folder = models.Folder || model<IFolder>("Folder", FolderSchema);
