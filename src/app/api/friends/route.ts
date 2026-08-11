import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Friendship } from "@/models/Friendship";
import { User } from "@/models/User";

const requestSchema = z.object({
  email: z.string().email(),
});

function oid(id: string) {
  return new mongoose.Types.ObjectId(id);
}

export async function GET() {
  const authResult = await requireUser();
  if ("error" in authResult && authResult.error) return authResult.error;
  const { userId } = authResult as { userId: string };
  const me = oid(userId);

  await connectDB();

  const friendships = await Friendship.find({
    $or: [{ requesterId: me }, { addresseeId: me }],
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
      const otherId =
        f.requesterId.toString() === userId
          ? f.addresseeId.toString()
          : f.requesterId.toString();
      const u = userMap.get(otherId);
      return {
        friendshipId: f._id.toString(),
        id: otherId,
        name: u?.name ?? "",
        email: u?.email ?? "",
      };
    });

  const incoming = friendships
    .filter((f) => f.status === "pending" && f.addresseeId.toString() === userId)
    .map((f) => {
      const otherId = f.requesterId.toString();
      const u = userMap.get(otherId);
      return {
        friendshipId: f._id.toString(),
        id: otherId,
        name: u?.name ?? "",
        email: u?.email ?? "",
      };
    });

  const outgoing = friendships
    .filter((f) => f.status === "pending" && f.requesterId.toString() === userId)
    .map((f) => {
      const otherId = f.addresseeId.toString();
      const u = userMap.get(otherId);
      return {
        friendshipId: f._id.toString(),
        id: otherId,
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
  const me = oid(userId);

  const body = await req.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  await connectDB();
  const target = await User.findOne({ email: parsed.data.email.toLowerCase().trim() });
  if (!target) {
    return NextResponse.json(
      { error: "No account found with that email. They need to register first." },
      { status: 404 }
    );
  }
  if (target._id.toString() === userId) {
    return NextResponse.json({ error: "Cannot friend yourself" }, { status: 400 });
  }

  const existing = await Friendship.findOne({
    $or: [
      { requesterId: me, addresseeId: target._id },
      { requesterId: target._id, addresseeId: me },
    ],
  });

  if (existing) {
    if (existing.status === "accepted") {
      return NextResponse.json({ error: "Already friends" }, { status: 409 });
    }
    if (existing.status === "pending") {
      // If they already sent you a request, auto-accept
      if (existing.addresseeId.toString() === userId) {
        existing.status = "accepted";
        await existing.save();
        return NextResponse.json({
          friendshipId: existing._id.toString(),
          status: "accepted",
        });
      }
      return NextResponse.json({ error: "Request already pending" }, { status: 409 });
    }
    existing.requesterId = me;
    existing.addresseeId = target._id;
    existing.status = "pending";
    await existing.save();
    return NextResponse.json({
      friendshipId: existing._id.toString(),
      status: "pending",
    });
  }

  const friendship = await Friendship.create({
    requesterId: me,
    addresseeId: target._id,
    status: "pending",
  });

  return NextResponse.json({
    friendshipId: friendship._id.toString(),
    status: "pending",
  });
}
