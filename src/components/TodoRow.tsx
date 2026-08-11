"use client";

import { useState } from "react";
import { formatRecurrenceLabel } from "@/lib/recurrence";

export type TodoRecurrence = {
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  byWeekday?: number[];
  endOn: string | null;
};

export type TodoItem = {
  id: string;
  title: string;
  notes: string;
  points: number;
  dueAt?: string | null;
  recurrence?: TodoRecurrence | null;
  completed: boolean;
  createdByName?: string;
  completedByName?: string | null;
  createdAt: string;
  completedAt?: string | null;
  /** Client-only: allow undoing last recurring occurrence */
  canUndoOccurrence?: boolean;
};

function formatDue(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return `Due ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }
  return `Due ${d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function isOverdue(iso: string, completed: boolean) {
  if (completed) return false;
  return new Date(iso).getTime() < Date.now();
}

export function TodoRow({
  todo,
  color,
  canEdit,
  onToggle,
  onEdit,
}: {
  todo: TodoItem;
  color: string;
  canEdit: boolean;
  onToggle: (id: string, completed: boolean) => void;
  onEdit?: (todo: TodoItem) => void;
}) {
  const [busy, setBusy] = useState(false);
  const overdue = todo.dueAt ? isOverdue(todo.dueAt, todo.completed) : false;
  const showUndo = todo.completed || !!todo.canUndoOccurrence;
  const repeatLabel = formatRecurrenceLabel(todo.recurrence ?? null);

  async function toggle() {
    if (!canEdit || busy) return;
    setBusy(true);
    try {
      if (todo.canUndoOccurrence && !todo.completed) {
        await onToggle(todo.id, false);
      } else {
        await onToggle(todo.id, !todo.completed);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`group flex items-start gap-3 border-b border-slate-200/60 px-4 py-3 transition-all duration-200 last:border-b-0 ${
        todo.completed ? "bg-black/[0.02]" : ""
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={!canEdit || busy}
        aria-label={showUndo ? "Undo complete" : "Mark complete"}
        className={`mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-transform duration-200 active:scale-90 ${
          canEdit ? "cursor-pointer" : "cursor-default"
        } ${todo.completed ? "animate-[checkPop_0.28s_ease]" : ""}`}
        style={{
          borderColor: color,
          backgroundColor: todo.completed ? color : "transparent",
        }}
      >
        {todo.completed && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6.5L5 9L9.5 3.5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div
          className={`text-[15px] leading-snug ${
            todo.completed
              ? "text-slate-400 line-through decoration-slate-400 decoration-2"
              : "text-slate-900"
          }`}
        >
          {todo.title}
        </div>
        {todo.notes ? (
          <p
            className={`mt-0.5 truncate text-xs text-slate-500 ${
              todo.completed ? "line-through decoration-slate-300" : ""
            }`}
          >
            {todo.notes}
          </p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <span>{todo.points} pts</span>
          {repeatLabel ? <span>· {repeatLabel}</span> : null}
          {todo.dueAt && !todo.completed ? (
            <span className={overdue ? "font-medium text-[#FF3B30]" : ""}>
              · {formatDue(todo.dueAt)}
            </span>
          ) : null}
          {todo.createdByName && !todo.completed ? (
            <span>· by {todo.createdByName}</span>
          ) : null}
          {todo.completed ? <span>· completed</span> : null}
        </div>
      </div>

      {canEdit && showUndo ? (
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className="app-text-accent mt-0.5 shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition hover:bg-white/70 disabled:opacity-60"
        >
          Undo
        </button>
      ) : canEdit && onEdit ? (
        <button
          type="button"
          aria-label="Edit reminder"
          onClick={() => onEdit(todo)}
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-70 transition hover:bg-white/70 hover:text-slate-700 group-hover:opacity-100"
        >
          <EditIcon />
        </button>
      ) : null}
    </div>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M11.5 2.5l2 2M3 13l.5-2.5L11.5 2.5l2 2L5.5 12.5 3 13z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
