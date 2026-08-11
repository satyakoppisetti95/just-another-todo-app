import mongoose, { Schema, models, model } from "mongoose";

export type ActivityType =
  | "todo_created"
  | "todo_completed"
  | "todo_uncompleted"
  | "folder_shared"
  | "points_awarded";

export interface IActivityEvent {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: ActivityType;
  meta: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityEventSchema = new Schema<IActivityEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: [
        "todo_created",
        "todo_completed",
        "todo_uncompleted",
        "folder_shared",
        "points_awarded",
      ],
      required: true,
      index: true,
    },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

ActivityEventSchema.index({ userId: 1, createdAt: -1 });

export const ActivityEvent =
  models.ActivityEvent || model<IActivityEvent>("ActivityEvent", ActivityEventSchema);
