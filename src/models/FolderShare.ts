import mongoose, { Schema, models, model } from "mongoose";

export type FolderRole = "collaborator" | "viewer";

export interface IFolderShare {
  _id: mongoose.Types.ObjectId;
  folderId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: FolderRole;
  invitedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FolderShareSchema = new Schema<IFolderShare>(
  {
    folderId: { type: Schema.Types.ObjectId, ref: "Folder", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: {
      type: String,
      enum: ["collaborator", "viewer"],
      required: true,
      default: "collaborator",
    },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

FolderShareSchema.index({ folderId: 1, userId: 1 }, { unique: true });

export const FolderShare =
  models.FolderShare || model<IFolderShare>("FolderShare", FolderShareSchema);
