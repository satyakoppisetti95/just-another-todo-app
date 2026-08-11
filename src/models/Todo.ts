import mongoose, { Schema, models, model } from "mongoose";

export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

export interface IRecurrence {
  frequency: RecurrenceFrequency;
  interval: number;
  byWeekday?: number[];
  endOn?: Date | null;
}

export interface ITodo {
  _id: mongoose.Types.ObjectId;
  folderId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  title: string;
  notes: string;
  points: number;
  dueAt?: Date | null;
  recurrence?: IRecurrence | null;
  completed: boolean;
  completedBy?: mongoose.Types.ObjectId | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const RecurrenceSchema = new Schema<IRecurrence>(
  {
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      required: true,
    },
    interval: { type: Number, default: 1, min: 1, max: 365 },
    byWeekday: { type: [Number], default: undefined },
    endOn: { type: Date, default: null },
  },
  { _id: false }
);

const TodoSchema = new Schema<ITodo>(
  {
    folderId: { type: Schema.Types.ObjectId, ref: "Folder", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    notes: { type: String, default: "" },
    points: { type: Number, default: 10, min: 0, max: 100 },
    dueAt: { type: Date, default: null, index: true },
    recurrence: { type: RecurrenceSchema, default: null },
    completed: { type: Boolean, default: false, index: true },
    completedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

TodoSchema.index({ completed: 1, completedAt: -1 });
TodoSchema.index({ folderId: 1, completed: 1, completedAt: -1 });

export const Todo = models.Todo || model<ITodo>("Todo", TodoSchema);
