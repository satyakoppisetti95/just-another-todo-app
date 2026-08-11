"use client";

import { FormEvent, useEffect, useState } from "react";
import type { TodoItem, TodoRecurrence } from "@/components/TodoRow";
import { Modal } from "@/components/Modal";
import { useConfirm } from "@/components/ModalProvider";
import { DEFAULT_POINTS, pointSelectOptions } from "@/lib/constants";

const WEEKDAYS = [
  { value: 0, label: "S" },
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" },
] as const;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalDateTime(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalDate(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toLocalTime(iso: string | null | undefined) {
  if (!iso) {
    const now = new Date();
    return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "09:00";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toEndOnDate(iso: string | null | undefined) {
  if (!iso) return "";
  return toLocalDate(iso);
}

export type EditTodoPatch = {
  title: string;
  notes: string;
  points: number;
  dueAt: string | null;
  recurrence: TodoRecurrence | null;
};

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
  onSave: (patch: EditTodoPatch) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const confirm = useConfirm();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [points, setPoints] = useState<number>(DEFAULT_POINTS);
  const [dueAt, setDueAt] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("09:00");
  const [frequency, setFrequency] = useState<"never" | "daily" | "weekly" | "monthly">(
    "never"
  );
  const [interval, setInterval] = useState(1);
  const [weekdays, setWeekdays] = useState<number[]>([1]);
  const [ends, setEnds] = useState<"never" | "on">("never");
  const [endOn, setEndOn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!todo || !open) return;
    setTitle(todo.title);
    setNotes(todo.notes || "");
    setPoints(todo.points);
    setDueAt(toLocalDateTime(todo.dueAt));
    setDueDate(toLocalDate(todo.dueAt) || toLocalDate(new Date().toISOString()));
    setDueTime(toLocalTime(todo.dueAt));
    const r = todo.recurrence;
    if (r) {
      setFrequency(r.frequency);
      setInterval(r.interval ?? 1);
      setWeekdays(r.byWeekday?.length ? [...r.byWeekday] : [new Date().getDay()]);
      if (r.endOn) {
        setEnds("on");
        setEndOn(toEndOnDate(r.endOn));
      } else {
        setEnds("never");
        setEndOn("");
      }
    } else {
      setFrequency("never");
      setInterval(1);
      setWeekdays([new Date().getDay()]);
      setEnds("never");
      setEndOn("");
    }
    setError("");
  }, [todo, open]);

  function toggleWeekday(day: number) {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    let nextDue: string | null = null;
    let recurrence: TodoRecurrence | null = null;

    if (frequency === "never") {
      nextDue = dueAt ? new Date(dueAt).toISOString() : null;
    } else {
      if (!dueDate || !dueTime) {
        setError("Pick a next due date and time");
        return;
      }
      const combined = new Date(`${dueDate}T${dueTime}`);
      if (Number.isNaN(combined.getTime())) {
        setError("Invalid due date/time");
        return;
      }
      nextDue = combined.toISOString();

      if (frequency === "weekly" && weekdays.length === 0) {
        setError("Pick at least one weekday");
        return;
      }
      if (ends === "on" && !endOn) {
        setError("Pick an end date");
        return;
      }

      recurrence = {
        frequency,
        interval: Math.max(1, interval),
        byWeekday: frequency === "weekly" ? weekdays : undefined,
        endOn:
          ends === "on" && endOn
            ? new Date(`${endOn}T23:59:59`).toISOString()
            : null,
      };
    }

    setLoading(true);
    setError("");
    try {
      await onSave({
        title: title.trim(),
        notes: notes.trim(),
        points,
        dueAt: nextDue,
        recurrence,
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

  const repeating = frequency !== "never";

  return (
    <Modal open={open && !!todo} onClose={onClose} labelledBy="edit-todo-title">
      {todo && (
        <form onSubmit={submit}>
          <h2 id="edit-todo-title" className="text-lg font-semibold text-slate-900">
            Edit Reminder
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Update details, due time, and repeat schedule.
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
              <select
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                disabled={todo.completed}
                className="mt-1 w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50"
                aria-label="Points"
              >
                {pointSelectOptions(todo.points).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">Repeat</label>
              <select
                value={frequency}
                onChange={(e) =>
                  setFrequency(e.target.value as "never" | "daily" | "weekly" | "monthly")
                }
                disabled={todo.completed}
                className="mt-1 w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50"
              >
                <option value="never">Never</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          {!repeating ? (
            <div className="mt-3">
              <label className="block text-xs font-medium text-slate-500">
                Due time <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              {dueAt && (
                <button
                  type="button"
                  onClick={() => setDueAt("")}
                  className="mt-2 text-xs text-slate-500 hover:text-slate-700"
                >
                  Clear due time
                </button>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500">
                    Next due date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="mt-1 w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500">
                    Time of day
                  </label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    required
                    className="mt-1 w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                This time repeats for every occurrence.
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-500">
                  Every
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={interval}
                    onChange={(e) => setInterval(Math.max(1, Number(e.target.value) || 1))}
                    className="w-20 rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <span className="text-sm text-slate-500">
                    {frequency === "daily"
                      ? interval === 1
                        ? "day"
                        : "days"
                      : frequency === "weekly"
                        ? interval === 1
                          ? "week"
                          : "weeks"
                        : interval === 1
                          ? "month"
                          : "months"}
                  </span>
                </div>
              </div>

              {frequency === "weekly" && (
                <div>
                  <label className="block text-xs font-medium text-slate-500">
                    Days of the week
                  </label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((d) => {
                      const on = weekdays.includes(d.value);
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => toggleWeekday(d.value)}
                          aria-pressed={on}
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition ${
                            on
                              ? "app-bg-accent text-white"
                              : "bg-white/70 text-slate-600 ring-1 ring-slate-200/80"
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-500">Ends</label>
                <select
                  value={ends}
                  onChange={(e) => setEnds(e.target.value as "never" | "on")}
                  className="mt-1 w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="never">Never</option>
                  <option value="on">On date</option>
                </select>
                {ends === "on" && (
                  <input
                    type="date"
                    value={endOn}
                    onChange={(e) => setEndOn(e.target.value)}
                    required
                    className="mt-2 w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                )}
              </div>
            </div>
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
