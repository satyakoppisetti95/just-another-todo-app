import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { FolderShare } from "@/models/FolderShare";
import { Friendship } from "@/models/Friendship";
import { User } from "@/models/User";
import { canManageShares, canView, getFolderAccess } from "@/lib/permissions";
import { logActivity } from "@/lib/analytics";

const inviteSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(50),
  role: z.enum(["collaborator", "viewer"]).default("collaborator"),
});

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["collaborator", "viewer"]),
});

function oid(id: string) {
  return new mongoose.Types.ObjectId(id);
}

async function assertFriends(ownerId: string, targetIds: string[]) {
  const me = oid(ownerId);
  const targets = targetIds.map(oid);
  const friendships = await Friendship.find({
    status: "accepted",
    $or: [
      { requesterId: me, addresseeId: { $in: targets } },
      { addresseeId: me, requesterId: { $in: targets } },
    ],
  }).lean();

  const friendSet = new Set(
    friendships.map((f) =>
      f.requesterId.toString() === ownerId
        ? f.addresseeId.toString()
        : f.requesterId.toString()
    )
  );

  return targetIds.filter((id) => friendSet.has(id));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireUser();
  if ("error" in authResult && authResult.error) return authResult.error;
  const { userId } = authResult as { userId: string };
  const { id } = await params;

  await connectDB();
  const { folder, access } = await getFolderAccess(id, userId);
  if (!folder || !canView(access)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const shares = await FolderShare.find({ folderId: folder._id }).lean();
  const users = await User.find({
    _id: { $in: shares.map((s) => s.userId) },
  }).select("name email");

  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  return NextResponse.json({
    shares: shares.map((s) => ({
      id: s._id.toString(),
      userId: s.userId.toString(),
      role: s.role,
      name: userMap.get(s.userId.toString())?.name ?? "",
      email: userMap.get(s.userId.toString())?.email ?? "",
    })),
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireUser();
  if ("error" in authResult && authResult.error) return authResult.error;
  const { userId } = authResult as { userId: string };
  const { id } = await params;

  await connectDB();
  const { folder, access } = await getFolderAccess(id, userId);
  if (!folder || !canManageShares(access)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (folder.isPrivate) {
    return NextResponse.json({ error: "Private lists cannot be shared" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Select at least one friend to invite" },
      { status: 400 }
    );
  }

  const uniqueIds = [...new Set(parsed.data.userIds.filter((id) => id !== userId))];
  if (uniqueIds.length === 0) {
    return NextResponse.json({ error: "Select at least one friend" }, { status: 400 });
  }

  const friendIds = await assertFriends(userId, uniqueIds);
  if (friendIds.length === 0) {
    return NextResponse.json(
      { error: "You can only share with accepted friends" },
      { status: 400 }
    );
  }

  const targets = await User.find({ _id: { $in: friendIds } }).select("name email");
  const invited = [];

  for (const target of targets) {
    const share = await FolderShare.findOneAndUpdate(
      { folderId: folder._id, userId: target._id },
      {
        folderId: folder._id,
        userId: target._id,
        role: parsed.data.role,
        invitedBy: userId,
      },
      { upsert: true, new: true }
    );

    await logActivity(userId, "folder_shared", {
      folderId: folder._id.toString(),
      sharedWith: target._id.toString(),
      role: parsed.data.role,
    });

    invited.push({
      id: share._id.toString(),
      userId: target._id.toString(),
      role: share.role,
      name: target.name,
      email: target.email,
    });
  }

  const skipped = uniqueIds.length - friendIds.length;
  return NextResponse.json({
    shares: invited,
    skipped,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireUser();
  if ("error" in authResult && authResult.error) return authResult.error;
  const { userId } = authResult as { userId: string };
  const { id } = await params;

  await connectDB();
  const { folder, access } = await getFolderAccess(id, userId);
  if (!folder || !canManageShares(access)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const share = await FolderShare.findOneAndUpdate(
    { folderId: folder._id, userId: parsed.data.userId },
    { $set: { role: parsed.data.role } },
    { new: true }
  );

  if (!share) {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }

  const user = await User.findById(parsed.data.userId).select("name email");
  return NextResponse.json({
    id: share._id.toString(),
    userId: share.userId.toString(),
    role: share.role,
    name: user?.name ?? "",
    email: user?.email ?? "",
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireUser();
  if ("error" in authResult && authResult.error) return authResult.error;
  const { userId } = authResult as { userId: string };
  const { id } = await params;

  await connectDB();
  const { folder, access } = await getFolderAccess(id, userId);
  if (!folder || !canManageShares(access)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const shareUserId = searchParams.get("userId");
  if (!shareUserId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  await FolderShare.deleteOne({ folderId: folder._id, userId: shareUserId });
  return NextResponse.json({ ok: true });
}
