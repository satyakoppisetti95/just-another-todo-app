import mongoose, { Schema, models, model } from "mongoose";

export type FriendshipStatus = "pending" | "accepted" | "declined";

export interface IFriendship {
  _id: mongoose.Types.ObjectId;
  requesterId: mongoose.Types.ObjectId;
  addresseeId: mongoose.Types.ObjectId;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

const FriendshipSchema = new Schema<IFriendship>(
  {
    requesterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    addresseeId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

FriendshipSchema.index({ requesterId: 1, addresseeId: 1 }, { unique: true });

export const Friendship =
  models.Friendship || model<IFriendship>("Friendship", FriendshipSchema);
