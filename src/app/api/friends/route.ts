import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Friendship } from "@/models/Friendship";
import { User } from "@/models/User";

const requestSchema = z.object({
  email: z.string().email(),
});

export async function GET() {
  const authResult = await requireUser();
  if ("error" in authResult && authResult.error) return authResult.error;
  const { userId } = authResult as { userId: string };

  await connectDB();

  const friendships = await Friendship.find({
    $or: [{ requesterId: userId }, { addresseeId: userId }],
    status: { $in: ["pending", "accepted"] },
  }).lean();

  const otherIds = friendships.map((f) =>
    f.requesterId.toString() === userId ? f.addresseeId : f.requesterId
  );
  const users = await User.find({ _id: { $in: otherIds } }).select("name email");
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const friends = friendships
    .filter((f) => f.status === "accepted")
    .map((f) => {
      const oid =
        f.requesterId.toString() === userId
          ? f.addresseeId.toString()
          : f.requesterId.toString();
      const u = userMap.get(oid);
      return {
        friendshipId: f._id.toString(),
        id: oid,
        name: u?.name ?? "",
        email: u?.email ?? "",
      };
    });

  const incoming = friendships
    .filter((f) => f.status === "pending" && f.addresseeId.toString() === userId)
    .map((f) => {
      const oid = f.requesterId.toString();
      const u = userMap.get(oid);
      return {
        friendshipId: f._id.toString(),
        id: oid,
        name: u?.name ?? "",
        email: u?.email ?? "",
      };
    });

  const outgoing = friendships
    .filter((f) => f.status === "pending" && f.requesterId.toString() === userId)
    .map((f) => {
      const oid = f.addresseeId.toString();
      const u = userMap.get(oid);
      return {
        friendshipId: f._id.toString(),
        id: oid,
        name: u?.name ?? "",
        email: u?.email ?? "",
      };
    });

  return NextResponse.json({ friends, incoming, outgoing });
}

export async function POST(req: Request) {
  const authResult = await requireUser();
  if ("error" in authResult && authResult.error) return authResult.error;
  const { userId } = authResult as { userId: string };

  const body = await req.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  await connectDB();
  const target = await User.findOne({ email: parsed.data.email.toLowerCase() });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (target._id.toString() === userId) {
    return NextResponse.json({ error: "Cannot friend yourself" }, { status: 400 });
  }

  const existing = await Friendship.findOne({
    $or: [
      { requesterId: userId, addresseeId: target._id },
      { requesterId: target._id, addresseeId: userId },
    ],
  });

  if (existing) {
    if (existing.status === "accepted") {
      return NextResponse.json({ error: "Already friends" }, { status: 409 });
    }
    if (existing.status === "pending") {
      return NextResponse.json({ error: "Request already pending" }, { status: 409 });
    }
    const mongoose = await import("mongoose");
    existing.requesterId = new mongoose.Types.ObjectId(userId);
    existing.addresseeId = target._id;
    existing.status = "pending";
    await existing.save();
    return NextResponse.json({ friendshipId: existing._id.toString(), status: "pending" });
  }

  const friendship = await Friendship.create({
    requesterId: userId,
    addresseeId: target._id,
    status: "pending",
  });

  return NextResponse.json({
    friendshipId: friendship._id.toString(),
    status: "pending",
  });
}
