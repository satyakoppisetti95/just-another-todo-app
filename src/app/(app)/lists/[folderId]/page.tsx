"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TodoRow, TodoItem } from "@/components/TodoRow";
import { ShareSheet } from "@/components/ShareSheet";
import { EditTodoSheet, type EditTodoPatch } from "@/components/EditTodoSheet";
import { CelebrationModal } from "@/components/CelebrationModal";
import { notifyStatsChanged } from "@/lib/events";
import { useConfirm } from "@/components/ModalProvider";
import {
  nextCelebrationMessage,
  type CelebrationPayload,
} from "@/lib/celebration";
import { DEFAULT_POINTS, POINT_OPTIONS } from "@/lib/constants";

type FolderMeta = {
  id: string;
  name: string;
  color: string;
  isPrivate: boolean;
  role: string;
  ownerId: string;
};

export default function FolderDetailPage() {
  const params = useParams<{ folderId: string }>();
  const router = useRouter();
  const folderId = params.folderId;
  const confirm = useConfirm();

  const [folder, setFolder] = useState<FolderMeta | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState<number>(DEFAULT_POINTS);
  const [shareOpen, setShareOpen] = useState(false);
  const [editing, setEditing] = useState<TodoItem | null>(null);
  const [celebration, setCelebration] = useState<CelebrationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Keep items completed during this visit visible (strikethrough + undo)
  // until the user leaves the list. Fresh visits only show open items.
  const sessionDoneIds = useRef<Set<string>>(new Set());
  // Recurring todos that advanced on complete — allow undoing last occurrence
  const sessionOccurrenceUndoIds = useRef<Set<string>>(new Set());

  const canEdit = folder?.role === "owner" || folder?.role === "collaborator";
  const isOwner = folder?.role === "owner";

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      setError("");
      try {
        const [fRes, tRes] = await Promise.all([
          fetch(`/api/folders/${folderId}`),
          fetch(`/api/folders/${folderId}/todos`),
        ]);
        if (!fRes.ok) {
          setError("List not found");
          setFolder(null);
          return;
        }
        const f = await fRes.json();
        const t = await tRes.json();
        const list = (t.todos ?? []) as TodoItem[];
        setFolder(f);
        setTodos(
          list
            .filter(
              (todo) =>
                !todo.completed || sessionDoneIds.current.has(todo.id)
            )
            .map((todo) => ({
              ...todo,
              canUndoOccurrence: sessionOccurrenceUndoIds.current.has(todo.id),
            }))
        );
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [folderId]
  );

  useEffect(() => {
    sessionDoneIds.current = new Set();
    sessionOccurrenceUndoIds.current = new Set();
    load();
  }, [load]);

  async function addTodo(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !canEdit) return;
    const res = await fetch(`/api/folders/${folderId}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), points }),
    });
    if (res.ok) {
      setTitle("");
      setPoints(DEFAULT_POINTS);
      window.dispatchEvent(
        new CustomEvent("jata:stats-delta", {
          detail: { points: 0, completions: 0, pending: 1, created: 1 },
        })
      );
      await load({ silent: true });
      notifyStatsChanged();
    }
  }

  async function toggle(id: string, completed: boolean) {
    const previous = todos.find((t) => t.id === id);
    const isRecurring = !!previous?.recurrence;

    if (completed) {
      if (!isRecurring) sessionDoneIds.current.add(id);
    } else {
      sessionDoneIds.current.delete(id);
      sessionOccurrenceUndoIds.current.delete(id);
    }

    // Optimistic: one-shot completes as done; recurring stays open visually until server responds
    if (!isRecurring || !completed) {
      setTodos((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                completed,
                completedAt: completed ? new Date().toISOString() : null,
                canUndoOccurrence: false,
              }
            : t
        )
      );
    }

    const res = await fetch(`/api/folders/${folderId}/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    if (!res.ok) {
      if (completed) sessionDoneIds.current.delete(id);
      else if (previous?.canUndoOccurrence) {
        sessionOccurrenceUndoIds.current.add(id);
      }
      if (previous) {
        setTodos((prev) => prev.map((t) => (t.id === id ? previous : t)));
      } else {
        await load({ silent: true });
      }
      return;
    }

    const data = await res.json();
    notifyStatsChanged();

    if (completed && previous) {
      setCelebration({
        message: nextCelebrationMessage(),
        points: previous.points,
        title: previous.title,
      });
    }

    if (completed && isRecurring && !data.completed) {
      sessionOccurrenceUndoIds.current.add(id);
      setTodos((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                ...mapTodoResponse(data, previous),
                completed: false,
                canUndoOccurrence: true,
              }
            : t
        )
      );
    } else if (completed && data.completed) {
      sessionDoneIds.current.add(id);
      setTodos((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                ...mapTodoResponse(data, previous),
                canUndoOccurrence: false,
              }
            : t
        )
      );
    } else {
      await load({ silent: true });
    }
  }

  async function saveEdit(patch: EditTodoPatch) {
    if (!editing) return;
    const res = await fetch(`/api/folders/${folderId}/todos/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to save");
    }
    await load({ silent: true });
  }

  async function deleteEditing() {
    if (!editing) return;
    await fetch(`/api/folders/${folderId}/todos/${editing.id}`, {
      method: "DELETE",
    });
    await load({ silent: true });
    notifyStatsChanged();
  }

  async function deleteList() {
    const ok = await confirm({
      title: "Delete this list?",
      message:
        "All reminders in this list will be permanently deleted. This cannot be undone.",
      confirmLabel: "Delete list",
      danger: true,
    });
    if (!ok) return;
    await fetch(`/api/folders/${folderId}`, { method: "DELETE" });
    notifyStatsChanged();
    router.push("/lists");
    router.refresh();
  }

  async function leaveList() {
    const ok = await confirm({
      title: "Leave this list?",
      message: "You’ll lose access until the owner invites you again.",
      confirmLabel: "Leave list",
      danger: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/folders/${folderId}/shares?userId=me`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to leave list");
      return;
    }
    notifyStatsChanged();
    router.push("/lists");
    router.refresh();
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error || !folder) return <p className="text-sm text-red-500">{error || "Not found"}</p>;

  const openCount = todos.filter((t) => !t.completed).length;
  // Open items first, then ones completed during this visit (still visible)
  const visibleTodos = [
    ...todos.filter((t) => !t.completed),
    ...todos.filter((t) => t.completed),
  ];

  return (
    <div className="animate-slide-up">
      <div className="flex items-start gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md"
          style={{ backgroundColor: folder.color }}
        >
          <svg width="22" height="22" viewBox="0 0 14 14" fill="none">
            <path
              d="M2 3.5h10M2 7h10M2 10.5h7"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-slate-900">
            {folder.name}
          </h2>
          <p className="text-sm text-slate-500">
            {openCount} open · {folder.role}
            {folder.isPrivate ? " · private" : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
          {isOwner && !folder.isPrivate && (
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="app-text-accent flex h-10 w-10 items-center justify-center rounded-xl active:opacity-60"
              aria-label="Share list"
              title="Share"
            >
              <ShareIcon />
            </button>
          )}
          {isOwner ? (
            <button
              type="button"
              onClick={deleteList}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-red-500 active:bg-red-50 active:opacity-60"
              aria-label="Delete list"
              title="Delete"
            >
              <TrashIcon />
            </button>
          ) : (
            <button
              type="button"
              onClick={leaveList}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-red-500 active:bg-red-50 active:opacity-60"
              aria-label="Leave list"
              title="Leave"
            >
              <LeaveIcon />
            </button>
          )}
        </div>
      </div>

      {canEdit && (
        <form onSubmit={addTodo} className="mt-6 flex flex-wrap gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New reminder"
            className="min-w-[200px] flex-1 rounded-xl border border-slate-200/70 bg-white/70 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-blue-500/25"
          />
          <select
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            className="w-24 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/25"
            title="Points"
            aria-label="Points"
          >
            {POINT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-xl bg-[#007AFF] px-4 py-3 text-sm font-semibold text-white"
          >
            Add
          </button>
        </form>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl bg-white/50 ring-1 ring-white/70">
        {visibleTodos.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">
            No reminders yet. Add one above.
          </p>
        ) : (
          visibleTodos.map((todo) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              color={folder.color}
              canEdit={!!canEdit}
              onToggle={toggle}
              onEdit={todo.completed ? undefined : setEditing}
            />
          ))
        )}
      </div>

      <ShareSheet
        open={shareOpen}
        folderId={folderId}
        isPrivate={folder.isPrivate}
        onClose={() => setShareOpen(false)}
      />

      <EditTodoSheet
        open={!!editing}
        todo={editing}
        onClose={() => setEditing(null)}
        onSave={saveEdit}
        onDelete={deleteEditing}
      />

      <CelebrationModal
        celebration={celebration}
        onClose={() => setCelebration(null)}
      />
    </div>
  );
}

function ShareIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="m19 6-.87 12.14A2 2 0 0 1 16.14 20H7.86a2 2 0 0 1-1.99-1.86L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function LeaveIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 17v1a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v1" />
      <path d="M15 12H3" />
      <path d="m7 8-4 4 4 4" />
    </svg>
  );
}

function mapTodoResponse(
  data: Partial<TodoItem> & { id?: string },
  previous?: TodoItem
): TodoItem {
  return {
    id: data.id ?? previous?.id ?? "",
    title: data.title ?? previous?.title ?? "",
    notes: data.notes ?? previous?.notes ?? "",
    points: data.points ?? previous?.points ?? 10,
    dueAt: data.dueAt !== undefined ? data.dueAt : previous?.dueAt ?? null,
    recurrence:
      data.recurrence !== undefined ? data.recurrence : previous?.recurrence ?? null,
    completed: data.completed ?? previous?.completed ?? false,
    createdByName: previous?.createdByName,
    completedByName: data.completedByName ?? previous?.completedByName ?? null,
    createdAt: data.createdAt ?? previous?.createdAt ?? new Date().toISOString(),
    completedAt: data.completedAt ?? null,
  };
}
