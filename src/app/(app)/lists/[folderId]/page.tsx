"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TodoRow, TodoItem } from "@/components/TodoRow";
import { ShareSheet } from "@/components/ShareSheet";
import { notifyStatsChanged } from "@/lib/events";

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

  const [folder, setFolder] = useState<FolderMeta | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState(1);
  const [shareOpen, setShareOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        setFolder(f);
        setTodos(
          (t.todos ?? []).map((todo: TodoItem & { createdAt: string }) => ({
            ...todo,
            createdAt: todo.createdAt,
          }))
        );
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [folderId]
  );

  useEffect(() => {
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
      setPoints(1);
      window.dispatchEvent(
        new CustomEvent("jata:stats-delta", {
          detail: { points: 0, completions: 0, created: 1 },
        })
      );
      await load({ silent: true });
      notifyStatsChanged();
    }
  }

  async function toggle(id: string, completed: boolean) {
    // Optimistic local update for snappy checkbox
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              completed,
              completedAt: completed ? new Date().toISOString() : null,
            }
          : t
      )
    );
    // Optimistic sidebar bump
    if (completed) {
      const todo = todos.find((t) => t.id === id);
      if (todo) {
        window.dispatchEvent(
          new CustomEvent("jata:stats-delta", {
            detail: { points: todo.points, completions: 1, created: 0 },
          })
        );
      }
    } else {
      const todo = todos.find((t) => t.id === id);
      if (todo) {
        window.dispatchEvent(
          new CustomEvent("jata:stats-delta", {
            detail: { points: -todo.points, completions: -1, created: 0 },
          })
        );
      }
    }

    const res = await fetch(`/api/folders/${folderId}/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    await load({ silent: true });
    notifyStatsChanged();
    if (!res.ok) {
      // Re-sync from server if toggle failed
      notifyStatsChanged();
    }
  }

  async function remove(id: string) {
    await fetch(`/api/folders/${folderId}/todos/${id}`, { method: "DELETE" });
    await load({ silent: true });
    notifyStatsChanged();
  }

  async function updatePoints(id: string, next: number) {
    await fetch(`/api/folders/${folderId}/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points: next }),
    });
    await load({ silent: true });
  }

  async function deleteList() {
    if (!confirm("Delete this list and all its todos?")) return;
    await fetch(`/api/folders/${folderId}`, { method: "DELETE" });
    notifyStatsChanged();
    router.push("/lists");
    router.refresh();
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error || !folder) return <p className="text-sm text-red-500">{error || "Not found"}</p>;

  const open = todos.filter((t) => !t.completed);
  const done = todos.filter((t) => t.completed);

  return (
    <div className="animate-slide-up">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md"
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
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-slate-900">
              {folder.name}
            </h2>
            <p className="text-sm text-slate-500">
              {open.length} open · {folder.role}
              {folder.isPrivate ? " · private" : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isOwner && !folder.isPrivate && (
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="rounded-xl bg-white/60 px-3 py-2 text-sm font-medium text-[#007AFF] ring-1 ring-white/70"
            >
              Share
            </button>
          )}
          {isOwner && (
            <button
              type="button"
              onClick={deleteList}
              className="rounded-xl px-3 py-2 text-sm text-red-500 hover:bg-red-50"
            >
              Delete
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
          <input
            type="number"
            min={0}
            max={100}
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            className="w-20 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-3 text-sm"
            title="Points"
          />
          <button
            type="submit"
            className="rounded-xl bg-[#007AFF] px-4 py-3 text-sm font-semibold text-white"
          >
            Add
          </button>
        </form>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl bg-white/50 ring-1 ring-white/70">
        {open.length === 0 && done.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">
            No reminders yet. Add one above.
          </p>
        ) : (
          <>
            {open.map((todo) => (
              <TodoRow
                key={todo.id}
                todo={todo}
                color={folder.color}
                canEdit={!!canEdit}
                onToggle={toggle}
                onDelete={remove}
                onUpdatePoints={updatePoints}
              />
            ))}
            {done.length > 0 && (
              <>
                <div className="bg-slate-100/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Completed
                </div>
                {done.map((todo) => (
                  <TodoRow
                    key={todo.id}
                    todo={todo}
                    color={folder.color}
                    canEdit={!!canEdit}
                    onToggle={toggle}
                    onDelete={remove}
                    onUpdatePoints={updatePoints}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>

      <ShareSheet
        open={shareOpen}
        folderId={folderId}
        isPrivate={folder.isPrivate}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}
