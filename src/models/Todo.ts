import mongoose, { Schema, models, model } from "mongoose";

export interface ITodo {
  _id: mongoose.Types.ObjectId;
  folderId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  title: string;
  notes: string;
  points: number;
  completed: boolean;
  completedBy?: mongoose.Types.ObjectId | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const TodoSchema = new Schema<ITodo>(
  {
    folderId: { type: Schema.Types.ObjectId, ref: "Folder", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    notes: { type: String, default: "" },
    points: { type: Number, default: 1, min: 0, max: 100 },
    completed: { type: Boolean, default: false, index: true },
    completedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Todo = models.Todo || model<ITodo>("Todo", TodoSchema);
