import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Folder } from "@/models/Folder";
import { FolderShare } from "@/models/FolderShare";
import { Todo } from "@/models/Todo";
import { User } from "@/models/User";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(req: Request) {
  const authResult = await requireUser();
  if ("error" in authResult && authResult.error) return authResult.error;
  const { userId } = authResult as { userId: string };
  const me = new mongoose.Types.ObjectId(userId);

  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folderId");
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(searchParams.get("limit") || DEFAULT_LIMIT))
  );
  const skip = (page - 1) * limit;

  await connectDB();

  const owned = await Folder.find({ ownerId: me }).select("_id name color isPrivate").lean();
  const shares = await FolderShare.find({ userId: me }).select("folderId").lean();
  const sharedFolders = await Folder.find({
    _id: { $in: shares.map((s) => s.folderId) },
    isPrivate: false,
  })
    .select("_id name color isPrivate")
    .lean();

  const accessible = [...owned, ...sharedFolders];
  const accessibleIds = accessible.map((f) => f._id);
  const folderMeta = new Map(
    accessible.map((f) => [
      f._id.toString(),
      { id: f._id.toString(), name: f.name, color: f.color, isPrivate: f.isPrivate },
    ])
  );

  let folderFilter = accessibleIds;
  if (folderId) {
    if (!mongoose.isValidObjectId(folderId)) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }
    const allowed = accessibleIds.some((id) => id.toString() === folderId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    folderFilter = [new mongoose.Types.ObjectId(folderId)];
  }

  const match = {
    completed: true,
    folderId: { $in: folderFilter },
  };

  const [total, todos] = await Promise.all([
    Todo.countDocuments(match),
    Todo.find(match)
      .sort({ completedAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const userIds = [
    ...new Set(
      todos
        .flatMap((t) => [t.createdBy?.toString(), t.completedBy?.toString()])
        .filter(Boolean) as string[]
    ),
  ];
  const users = await User.find({ _id: { $in: userIds } }).select("name");
  const nameMap = new Map(users.map((u) => [u._id.toString(), u.name]));

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return NextResponse.json({
    todos: todos.map((t) => {
      const fid = t.folderId.toString();
      const folder = folderMeta.get(fid);
      return {
        id: t._id.toString(),
        title: t.title,
        notes: t.notes,
        points: t.points,
        folderId: fid,
        folderName: folder?.name ?? "List",
        folderColor: folder?.color ?? "#8E8E93",
        isPrivate: folder?.isPrivate ?? false,
        createdByName: nameMap.get(t.createdBy.toString()) ?? "",
        completedByName: t.completedBy
          ? nameMap.get(t.completedBy.toString()) ?? ""
          : "",
        completedAt: t.completedAt,
        createdAt: t.createdAt,
      };
    }),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
    filters: {
      folders: accessible.map((f) => ({
        id: f._id.toString(),
        name: f.name,
        color: f.color,
        isPrivate: f.isPrivate,
      })),
      folderId: folderId || null,
    },
  });
}
