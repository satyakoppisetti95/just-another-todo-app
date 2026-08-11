import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Todo } from "@/models/Todo";
import { User } from "@/models/User";
import { canEdit, canView, getFolderAccess } from "@/lib/permissions";
import { logActivity } from "@/lib/analytics";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).optional(),
  points: z.number().int().min(0).max(100).optional(),
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

  const todos = await Todo.find({ folderId: folder._id })
    .sort({ completed: 1, createdAt: -1 })
    .lean();

  const userIds = [
    ...new Set(
      todos
        .flatMap((t) => [t.createdBy.toString(), t.completedBy?.toString()])
        .filter(Boolean) as string[]
    ),
  ];
  const users = await User.find({ _id: { $in: userIds } }).select("name");
  const nameMap = new Map(users.map((u) => [u._id.toString(), u.name]));

  return NextResponse.json({
    todos: todos.map((t) => ({
      id: t._id.toString(),
      title: t.title,
      notes: t.notes,
      points: t.points,
      completed: t.completed,
      createdBy: t.createdBy.toString(),
      createdByName: nameMap.get(t.createdBy.toString()) ?? "",
      completedBy: t.completedBy?.toString() ?? null,
      completedByName: t.completedBy
        ? nameMap.get(t.completedBy.toString()) ?? ""
        : null,
      completedAt: t.completedAt,
      createdAt: t.createdAt,
    })),
    role: access,
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
  if (!folder || !canEdit(access)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const todo = await Todo.create({
    folderId: folder._id,
    createdBy: userId,
    title: parsed.data.title,
    notes: parsed.data.notes ?? "",
    points: parsed.data.points ?? 1,
  });

  await logActivity(userId, "todo_created", {
    todoId: todo._id.toString(),
    folderId: folder._id.toString(),
    points: todo.points,
  });

  // Also attribute creation to folder owner for analytics if different
  if (folder.ownerId.toString() !== userId) {
    await logActivity(folder.ownerId.toString(), "todo_created", {
      todoId: todo._id.toString(),
      folderId: folder._id.toString(),
      points: todo.points,
      by: userId,
    });
  }

  return NextResponse.json({
    id: todo._id.toString(),
    title: todo.title,
    notes: todo.notes,
    points: todo.points,
    completed: false,
    createdBy: userId,
    createdAt: todo.createdAt,
  });
}
