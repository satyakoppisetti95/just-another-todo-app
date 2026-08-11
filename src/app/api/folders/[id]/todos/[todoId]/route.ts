import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Todo } from "@/models/Todo";
import { PointEvent } from "@/models/PointEvent";
import { ActivityEvent } from "@/models/ActivityEvent";
import { canEdit, getFolderAccess } from "@/lib/permissions";
import { logActivity } from "@/lib/analytics";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  notes: z.string().max(2000).optional(),
  points: z.number().int().min(0).max(100).optional(),
  dueAt: z.union([z.string().min(1), z.null()]).optional(),
  completed: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; todoId: string }> }
) {
  const authResult = await requireUser();
  if ("error" in authResult && authResult.error) return authResult.error;
  const { userId } = authResult as { userId: string };
  const { id, todoId } = await params;

  await connectDB();
  const { folder, access } = await getFolderAccess(id, userId);
  if (!folder || !canEdit(access)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const todo = await Todo.findOne({ _id: todoId, folderId: folder._id });
  if (!todo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (parsed.data.title !== undefined) todo.title = parsed.data.title;
  if (parsed.data.notes !== undefined) todo.notes = parsed.data.notes;
  if (parsed.data.points !== undefined && !todo.completed) {
    todo.points = parsed.data.points;
  }
  if (parsed.data.dueAt !== undefined) {
    todo.dueAt = parsed.data.dueAt ? new Date(parsed.data.dueAt) : null;
  }

  if (parsed.data.completed !== undefined && parsed.data.completed !== todo.completed) {
    if (parsed.data.completed) {
      todo.completed = true;
      todo.completedBy = new mongoose.Types.ObjectId(userId);
      todo.completedAt = new Date();

      const ownerId = folder.ownerId.toString();
      const source = userId === ownerId ? "self" : "peer";

      // Ensure we never stack awards if a prior undo failed to clean up
      await PointEvent.deleteMany({ todoId: todo._id });

      await PointEvent.create({
        userId: ownerId,
        todoId: todo._id,
        folderId: folder._id,
        awardedBy: userId,
        points: todo.points,
        source,
      });

      if (userId !== ownerId) {
        await PointEvent.create({
          userId,
          todoId: todo._id,
          folderId: folder._id,
          awardedBy: userId,
          points: todo.points,
          source: "self",
        });
      }

      await logActivity(ownerId, "todo_completed", {
        todoId: todo._id.toString(),
        folderId: folder._id.toString(),
        points: todo.points,
        completedBy: userId,
        source,
      });
      await logActivity(ownerId, "points_awarded", {
        todoId: todo._id.toString(),
        points: todo.points,
        source,
      });

      if (userId !== ownerId) {
        await logActivity(userId, "todo_completed", {
          todoId: todo._id.toString(),
          folderId: folder._id.toString(),
          points: todo.points,
          source: "self",
        });
        await logActivity(userId, "points_awarded", {
          todoId: todo._id.toString(),
          points: todo.points,
          source: "self",
        });
      }
    } else {
      todo.completed = false;
      todo.completedBy = null;
      todo.completedAt = null;

      // Remove all point awards for this reminder (owner + peer copies)
      await PointEvent.deleteMany({ todoId: todo._id });

      // Roll back today's completion/points activity so analytics match
      await ActivityEvent.deleteMany({
        type: { $in: ["todo_completed", "points_awarded"] },
        "meta.todoId": todo._id.toString(),
      });

      await logActivity(userId, "todo_uncompleted", {
        todoId: todo._id.toString(),
        folderId: folder._id.toString(),
      });
    }
  }

  await todo.save();

  return NextResponse.json({
    id: todo._id.toString(),
    title: todo.title,
    notes: todo.notes,
    points: todo.points,
    dueAt: todo.dueAt ?? null,
    completed: todo.completed,
    completedBy: todo.completedBy?.toString() ?? null,
    completedAt: todo.completedAt,
    createdAt: todo.createdAt,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; todoId: string }> }
) {
  const authResult = await requireUser();
  if ("error" in authResult && authResult.error) return authResult.error;
  const { userId } = authResult as { userId: string };
  const { id, todoId } = await params;

  await connectDB();
  const { folder, access } = await getFolderAccess(id, userId);
  if (!folder || !canEdit(access)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const todo = await Todo.findOneAndDelete({ _id: todoId, folderId: folder._id });
  if (!todo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await PointEvent.deleteMany({ todoId: todo._id });
  return NextResponse.json({ ok: true });
}
