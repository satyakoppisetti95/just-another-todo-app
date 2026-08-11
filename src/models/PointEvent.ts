import mongoose, { Schema, models, model } from "mongoose";

export type PointSource = "self" | "peer";

export interface IPointEvent {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  todoId: mongoose.Types.ObjectId;
  folderId: mongoose.Types.ObjectId;
  awardedBy: mongoose.Types.ObjectId;
  points: number;
  source: PointSource;
  createdAt: Date;
  updatedAt: Date;
}

const PointEventSchema = new Schema<IPointEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    todoId: { type: Schema.Types.ObjectId, ref: "Todo", required: true },
    folderId: { type: Schema.Types.ObjectId, ref: "Folder", required: true, index: true },
    awardedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    points: { type: Number, required: true },
    source: { type: String, enum: ["self", "peer"], required: true },
  },
  { timestamps: true }
);

PointEventSchema.index({ userId: 1, createdAt: -1 });

export const PointEvent =
  models.PointEvent || model<IPointEvent>("PointEvent", PointEventSchema);
