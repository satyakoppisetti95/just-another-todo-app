"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { notifyStatsChanged } from "@/lib/events";

type CompletedTodo = {
  id: string;
  title: string;
  notes: string;
  points: number;
  folderId: string;
  folderName: string;
  folderColor: string;
  isPrivate: boolean;
  createdByName: string;
  completedByName: string;
  completedAt: string | null;
  createdAt: string;
};

type FolderFilter = {
  id: string;
  name: string;
  color: string;
  isPrivate: boolean;
};

function formatWhen(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function CompletedPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const folderId = searchParams.get("folderId") || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1));

  const [todos, setTodos] = useState<CompletedTodo[]>([]);
  const [folders, setFolders] = useState<FolderFilter[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const setQuery = useCallback(
    (next: { folderId?: string; page?: number }) => {
      const params = new URLSearchParams();
      const f = next.folderId !== undefined ? next.folderId : folderId;
      const p = next.page !== undefined ? next.page : page;
      if (f) params.set("folderId", f);
      if (p > 1) params.set("page", String(p));
      const q = params.toString();
      router.replace(q ? `/completed?${q}` : "/completed");
    },
    [folderId, page, router]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (folderId) params.set("folderId", folderId);
      const res = await fetch(`/api/todos/completed?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setTodos(data.todos ?? []);
      setFolders(data.filters?.folders ?? []);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [folderId, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function uncomplete(todo: CompletedTodo) {
    setBusyId(todo.id);
    try {
      await fetch(`/api/folders/${todo.folderId}/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: false }),
      });
      notifyStatsChanged();
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="animate-slide-up">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-slate-900">
            Completed
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            All finished reminders across your lists, newest first.
          </p>
        </div>
        <div className="rounded-xl bg-white/55 px-3 py-2 text-sm tabular-nums text-slate-600 ring-1 ring-white/70">
          {total} total
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <label className="text-xs font-medium text-slate-500">Filter by list</label>
        <select
          value={folderId}
          onChange={(e) => setQuery({ folderId: e.target.value, page: 1 })}
          className="rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/25"
        >
          <option value="">All lists</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
              {f.isPrivate ? " (private)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl bg-white/50 ring-1 ring-white/70">
        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">Loading…</p>
        ) : todos.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">
            No completed reminders yet.
          </p>
        ) : (
          <ul>
            {todos.map((todo) => (
              <li
                key={todo.id}
                className="flex items-start gap-3 border-b border-slate-200/60 px-4 py-3 last:border-b-0"
              >
                <button
                  type="button"
                  disabled={busyId === todo.id}
                  onClick={() => uncomplete(todo)}
                  title="Mark incomplete"
                  className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90 disabled:opacity-50"
                  style={{
                    borderColor: todo.folderColor,
                    backgroundColor: todo.folderColor,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2.5 6.5L5 9L9.5 3.5"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <div className="min-w-0 flex-1">
                  <div className="text-[15px] leading-snug text-slate-500 line-through decoration-slate-400">
                    {todo.title}
                  </div>
                  {todo.notes ? (
                    <p className="mt-0.5 truncate text-xs text-slate-400">{todo.notes}</p>
                  ) : null}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
                    <Link
                      href={`/lists/${todo.folderId}`}
                      className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-[#007AFF]"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: todo.folderColor }}
                      />
                      {todo.folderName}
                    </Link>
                    <span>· {todo.points} pts</span>
                    {todo.completedByName ? <span>· {todo.completedByName}</span> : null}
                    {todo.completedAt ? (
                      <span>· {formatWhen(todo.completedAt)}</span>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setQuery({ page: page - 1 })}
            className="rounded-xl bg-white/60 px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-white/70 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm tabular-nums text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setQuery({ page: page + 1 })}
            className="rounded-xl bg-white/60 px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-white/70 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default function CompletedPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
      <CompletedPageInner />
    </Suspense>
  );
}
