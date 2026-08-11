"use client";

import { useState } from "react";

export type TodoItem = {
  id: string;
  title: string;
  notes: string;
  points: number;
  completed: boolean;
  createdByName?: string;
  completedByName?: string | null;
  createdAt: string;
  completedAt?: string | null;
};

export function TodoRow({
  todo,
  color,
  canEdit,
  onToggle,
  onDelete,
  onUpdatePoints,
}: {
  todo: TodoItem;
  color: string;
  canEdit: boolean;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onUpdatePoints: (id: string, points: number) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!canEdit || busy) return;
    setBusy(true);
    try {
      await onToggle(todo.id, !todo.completed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`group flex items-start gap-3 border-b border-slate-200/60 px-4 py-3 transition-all duration-200 last:border-b-0 ${
        todo.completed ? "opacity-55" : "opacity-100"
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={!canEdit || busy}
        aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
        className={`mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-transform duration-200 active:scale-90 ${
          canEdit ? "cursor-pointer" : "cursor-default"
        }`}
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
          className={`text-[15px] leading-snug text-slate-900 ${
            todo.completed ? "line-through decoration-slate-400" : ""
          }`}
        >
          {todo.title}
        </div>
        {todo.notes ? (
          <p className="mt-0.5 truncate text-xs text-slate-500">{todo.notes}</p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <span>{todo.points} pts</span>
          {todo.createdByName ? <span>· by {todo.createdByName}</span> : null}
          {todo.completed && todo.completedByName ? (
            <span>· done by {todo.completedByName}</span>
          ) : null}
        </div>
      </div>

      {canEdit && !todo.completed && (
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            className="rounded-lg px-1.5 py-0.5 text-xs text-slate-500 hover:bg-white/70"
            onClick={() => onUpdatePoints(todo.id, Math.max(0, todo.points - 1))}
          >
            −
          </button>
          <button
            type="button"
            className="rounded-lg px-1.5 py-0.5 text-xs text-slate-500 hover:bg-white/70"
            onClick={() => onUpdatePoints(todo.id, Math.min(100, todo.points + 1))}
          >
            +
          </button>
          <button
            type="button"
            className="rounded-lg px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50"
            onClick={() => onDelete(todo.id)}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
