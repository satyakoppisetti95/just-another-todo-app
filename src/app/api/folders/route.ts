import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Folder } from "@/models/Folder";
import { FOLDER_COLORS } from "@/lib/constants";
import { FolderShare } from "@/models/FolderShare";
import { Todo } from "@/models/Todo";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  color: z.string().optional(),
  icon: z.string().optional(),
  isPrivate: z.boolean().optional(),
});

export async function GET() {
  const authResult = await requireUser();
  if ("error" in authResult && authResult.error) return authResult.error;
  const { userId } = authResult as { userId: string };

  await connectDB();

  const owned = await Folder.find({ ownerId: userId }).sort({ createdAt: 1 }).lean();
  const shares = await FolderShare.find({ userId }).lean();
  const sharedFolderIds = shares.map((s) => s.folderId);
  const sharedFolders = await Folder.find({
    _id: { $in: sharedFolderIds },
    isPrivate: false,
  }).lean();

  const allIds = [...owned.map((f) => f._id), ...sharedFolders.map((f) => f._id)];
  const counts = await Todo.aggregate([
    { $match: { folderId: { $in: allIds }, completed: false } },
    { $group: { _id: "$folderId", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.count as number]));
  const shareRoleMap = new Map(shares.map((s) => [s.folderId.toString(), s.role]));

  return NextResponse.json({
    owned: owned.map((f) => ({
      id: f._id.toString(),
      name: f.name,
      color: f.color,
      icon: f.icon,
      isPrivate: f.isPrivate,
      role: "owner" as const,
      incompleteCount: countMap.get(f._id.toString()) ?? 0,
    })),
    shared: sharedFolders.map((f) => ({
      id: f._id.toString(),
      name: f.name,
      color: f.color,
      icon: f.icon,
      isPrivate: false,
      role: shareRoleMap.get(f._id.toString()) ?? "viewer",
      incompleteCount: countMap.get(f._id.toString()) ?? 0,
      ownerId: f.ownerId.toString(),
    })),
    colors: FOLDER_COLORS,
  });
}

export async function POST(req: Request) {
  const authResult = await requireUser();
  if ("error" in authResult && authResult.error) return authResult.error;
  const { userId } = authResult as { userId: string };

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await connectDB();
  const folder = await Folder.create({
    ownerId: userId,
    name: parsed.data.name,
    color: parsed.data.color ?? "#007AFF",
    icon: parsed.data.isPrivate ? "lock" : (parsed.data.icon ?? "list"),
    isPrivate: parsed.data.isPrivate ?? false,
  });

  return NextResponse.json({
    id: folder._id.toString(),
    name: folder.name,
    color: folder.color,
    icon: folder.icon,
    isPrivate: folder.isPrivate,
    role: "owner",
    incompleteCount: 0,
  });
}
