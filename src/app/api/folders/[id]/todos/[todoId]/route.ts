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
import { nextDueAt, serializeRecurrence } from "@/lib/recurrence";
import { normalizeRecurrence, recurrenceSchema } from "@/lib/recurrenceSchema";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  notes: z.string().max(2000).optional(),
  points: z.number().int().min(0).max(100).optional(),
  dueAt: z.union([z.string().min(1), z.null()]).optional(),
  completed: z.boolean().optional(),
  recurrence: recurrenceSchema.optional(),
});

function todoJson(todo: InstanceType<typeof Todo>) {
  return {
    id: todo._id.toString(),
    title: todo.title,
    notes: todo.notes,
    points: todo.points,
    dueAt: todo.dueAt ?? null,
    recurrence: serializeRecurrence(todo.recurrence ?? null),
    completed: todo.completed,
    completedBy: todo.completedBy?.toString() ?? null,
    completedAt: todo.completedAt,
    createdAt: todo.createdAt,
  };
}

async function awardCompletion(opts: {
  todo: InstanceType<typeof Todo>;
  folderId: mongoose.Types.ObjectId;
  ownerId: string;
  userId: string;
  occurrenceKey: string | null;
  recurring: boolean;
}) {
  const { todo, folderId, ownerId, userId, occurrenceKey, recurring } = opts;
  const source = userId === ownerId ? "self" : "peer";

  await PointEvent.create({
    userId: ownerId,
    todoId: todo._id,
    folderId,
    awardedBy: userId,
    points: todo.points,
    source,
    occurrenceKey,
  });

  if (userId !== ownerId) {
    await PointEvent.create({
      userId,
      todoId: todo._id,
      folderId,
      awardedBy: userId,
      points: todo.points,
      source: "self",
      occurrenceKey,
    });
  }

  const meta = {
    todoId: todo._id.toString(),
    folderId: folderId.toString(),
    points: todo.points,
    completedBy: userId,
    source,
    occurrenceKey,
    recurring,
  };

  await logActivity(ownerId, "todo_completed", meta);
  await logActivity(ownerId, "points_awarded", {
    todoId: todo._id.toString(),
    points: todo.points,
    source,
    occurrenceKey,
    recurring,
  });

  if (userId !== ownerId) {
    await logActivity(userId, "todo_completed", {
      ...meta,
      source: "self",
    });
    await logActivity(userId, "points_awarded", {
      todoId: todo._id.toString(),
      points: todo.points,
      source: "self",
      occurrenceKey,
      recurring,
    });
  }
}

async function rollbackOccurrence(todoId: mongoose.Types.ObjectId, occurrenceKey: string) {
  await PointEvent.deleteMany({ todoId, occurrenceKey });
  await ActivityEvent.deleteMany({
    type: { $in: ["todo_completed", "points_awarded"] },
    "meta.todoId": todoId.toString(),
    "meta.occurrenceKey": occurrenceKey,
  });
}

async function rollbackAllForTodo(todoId: mongoose.Types.ObjectId) {
  await PointEvent.deleteMany({ todoId });
  await ActivityEvent.deleteMany({
    type: { $in: ["todo_completed", "points_awarded"] },
    "meta.todoId": todoId.toString(),
  });
}

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
  if (parsed.data.recurrence !== undefined) {
    try {
      const normalized = normalizeRecurrence(parsed.data.recurrence);
      if (normalized && !todo.dueAt && parsed.data.dueAt === undefined) {
        return NextResponse.json(
          { error: "Due date/time is required for recurring reminders" },
          { status: 400 }
        );
      }
      if (normalized && parsed.data.dueAt === null) {
        return NextResponse.json(
          { error: "Due date/time is required for recurring reminders" },
          { status: 400 }
        );
      }
      if (normalized && !todo.dueAt) {
        return NextResponse.json(
          { error: "Due date/time is required for recurring reminders" },
          { status: 400 }
        );
      }
      todo.recurrence = normalized;
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Invalid recurrence" },
        { status: 400 }
      );
    }
  }

  // After field updates, re-check recurrence + dueAt consistency
  if (todo.recurrence && !todo.dueAt) {
    return NextResponse.json(
      { error: "Due date/time is required for recurring reminders" },
      { status: 400 }
    );
  }

  const ownerId = folder.ownerId.toString();
  const isRecurring = !!todo.recurrence;

  if (parsed.data.completed !== undefined) {
    if (parsed.data.completed === true) {
      if (todo.completed) {
        return NextResponse.json(todoJson(todo));
      }

      const now = new Date();
      const occurrenceDue = todo.dueAt ? new Date(todo.dueAt) : now;
      const occurrenceKey = occurrenceDue.toISOString();

      if (isRecurring && todo.recurrence) {
        await awardCompletion({
          todo,
          folderId: folder._id,
          ownerId,
          userId,
          occurrenceKey,
          recurring: true,
        });

        const next = nextDueAt(occurrenceDue, todo.recurrence, now);
        if (next) {
          todo.dueAt = next;
          todo.completed = false;
          todo.completedBy = null;
          todo.completedAt = null;
        } else {
          todo.completed = true;
          todo.completedBy = new mongoose.Types.ObjectId(userId);
          todo.completedAt = now;
        }
      } else {
        todo.completed = true;
        todo.completedBy = new mongoose.Types.ObjectId(userId);
        todo.completedAt = now;

        await PointEvent.deleteMany({ todoId: todo._id });
        await awardCompletion({
          todo,
          folderId: folder._id,
          ownerId,
          userId,
          occurrenceKey: null,
          recurring: false,
        });
      }
    } else {
      // completed: false — undo
      if (isRecurring && todo.recurrence) {
        const latest = await PointEvent.findOne({
          todoId: todo._id,
          occurrenceKey: { $ne: null },
        })
          .sort({ createdAt: -1 })
          .lean();

        if (!latest?.occurrenceKey) {
          // Nothing to undo
          todo.completed = false;
          todo.completedBy = null;
          todo.completedAt = null;
        } else {
          const key = latest.occurrenceKey;
          await rollbackOccurrence(todo._id, key);
          todo.dueAt = new Date(key);
          todo.completed = false;
          todo.completedBy = null;
          todo.completedAt = null;

          await logActivity(userId, "todo_uncompleted", {
            todoId: todo._id.toString(),
            folderId: folder._id.toString(),
            occurrenceKey: key,
            recurring: true,
          });
        }
      } else if (todo.completed) {
        todo.completed = false;
        todo.completedBy = null;
        todo.completedAt = null;
        await rollbackAllForTodo(todo._id);
        await logActivity(userId, "todo_uncompleted", {
          todoId: todo._id.toString(),
          folderId: folder._id.toString(),
        });
      }
    }
  }

  await todo.save();
  return NextResponse.json(todoJson(todo));
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
