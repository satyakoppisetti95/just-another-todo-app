import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { FolderShare } from "@/models/FolderShare";
import { User } from "@/models/User";
import { canManageShares, canView, getFolderAccess } from "@/lib/permissions";
import { logActivity } from "@/lib/analytics";

const shareSchema = z.object({
  email: z.string().email(),
  role: z.enum(["collaborator", "viewer"]).default("collaborator"),
});

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
  const parsed = shareSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const target = await User.findOne({ email: parsed.data.email.toLowerCase() });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (target._id.toString() === userId) {
    return NextResponse.json({ error: "Cannot share with yourself" }, { status: 400 });
  }

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

  return NextResponse.json({
    id: share._id.toString(),
    userId: target._id.toString(),
    role: share.role,
    name: target.name,
    email: target.email,
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
