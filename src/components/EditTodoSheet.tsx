"use client";

import { FormEvent, useEffect, useState } from "react";
import type { TodoItem } from "@/components/TodoRow";
import { Modal } from "@/components/Modal";
import { useConfirm } from "@/components/ModalProvider";

function toLocalInputValue(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditTodoSheet({
  open,
  todo,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  todo: TodoItem | null;
  onClose: () => void;
  onSave: (patch: {
    title: string;
    notes: string;
    points: number;
    dueAt: string | null;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const confirm = useConfirm();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [points, setPoints] = useState(1);
  const [dueAt, setDueAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!todo || !open) return;
    setTitle(todo.title);
    setNotes(todo.notes || "");
    setPoints(todo.points);
    setDueAt(toLocalInputValue(todo.dueAt));
    setError("");
  }, [todo, open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onSave({
        title: title.trim(),
        notes: notes.trim(),
        points,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    const ok = await confirm({
      title: "Delete reminder?",
      message: "This reminder will be permanently removed.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    setLoading(true);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open && !!todo} onClose={onClose} labelledBy="edit-todo-title">
      {todo && (
        <form onSubmit={submit}>
          <h2 id="edit-todo-title" className="text-lg font-semibold text-slate-900">
            Edit Reminder
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Update details and optional due time.
          </p>

          <label className="mt-4 block text-xs font-medium text-slate-500">Title</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
            required
          />

          <label className="mt-3 block text-xs font-medium text-slate-500">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full resize-none rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
            placeholder="Optional"
          />

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500">Points</label>
              <input
                type="number"
                min={0}
                max={100}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                disabled={todo.completed}
                className="mt-1 w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">
                Due time <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          {dueAt && (
            <button
              type="button"
              onClick={() => setDueAt("")}
              className="mt-2 text-xs text-slate-500 hover:text-slate-700"
            >
              Clear due time
            </button>
          )}

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

          <div className="mt-5 flex items-center justify-between gap-2">
            {onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="rounded-xl px-3 py-2 text-sm text-red-500 hover:bg-red-50 disabled:opacity-60"
              >
                Delete
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="app-bg-accent rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60"
              >
                {loading ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
