import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Folder } from "@/models/Folder";
import { FolderShare } from "@/models/FolderShare";
import { Todo } from "@/models/Todo";
import { PointEvent } from "@/models/PointEvent";
import { canManageShares, canView, getFolderAccess } from "@/lib/permissions";

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  isPrivate: z.boolean().optional(),
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

  const incompleteCount = await Todo.countDocuments({
    folderId: folder._id,
    completed: false,
  });

  return NextResponse.json({
    id: folder._id.toString(),
    name: folder.name,
    color: folder.color,
    icon: folder.icon,
    isPrivate: folder.isPrivate,
    ownerId: folder.ownerId.toString(),
    role: access,
    incompleteCount,
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
  if (!folder || access !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (parsed.data.name !== undefined) folder.name = parsed.data.name;
  if (parsed.data.color !== undefined) folder.color = parsed.data.color;
  if (parsed.data.icon !== undefined) folder.icon = parsed.data.icon;
  if (parsed.data.isPrivate !== undefined) {
    folder.isPrivate = parsed.data.isPrivate;
    if (parsed.data.isPrivate) {
      await FolderShare.deleteMany({ folderId: folder._id });
      folder.icon = "lock";
    }
  }

  await folder.save();
  return NextResponse.json({
    id: folder._id.toString(),
    name: folder.name,
    color: folder.color,
    icon: folder.icon,
    isPrivate: folder.isPrivate,
    role: "owner",
  });
}

export async function DELETE(
  _req: Request,
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

  await Promise.all([
    Todo.deleteMany({ folderId: folder._id }),
    FolderShare.deleteMany({ folderId: folder._id }),
    PointEvent.deleteMany({ folderId: folder._id }),
    Folder.deleteOne({ _id: folder._id }),
  ]);

  return NextResponse.json({ ok: true });
}
