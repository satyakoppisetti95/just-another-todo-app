"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FolderListItem } from "@/components/Sidebar";

export default function ListsHomePage() {
  const [owned, setOwned] = useState<FolderListItem[]>([]);
  const [shared, setShared] = useState<FolderListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/folders")
      .then((r) => r.json())
      .then((d) => {
        setOwned(d.owned ?? []);
        setShared(d.shared ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading lists…</p>;
  }

  return (
    <div className="animate-slide-up">
      <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-slate-900">
        Lists
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Pick a list or create one from the sidebar. Complete tasks to earn points.
      </p>

      <section className="mt-8">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          My Lists
        </h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {owned.map((f) => (
            <ListCard key={f.id} folder={f} />
          ))}
        </div>
      </section>

      {shared.length > 0 && (
        <section className="mt-8">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Shared with me
          </h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {shared.map((f) => (
              <ListCard key={f.id} folder={f} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ListCard({ folder }: { folder: FolderListItem }) {
  return (
    <Link
      href={`/lists/${folder.id}`}
      className="flex items-center gap-3 rounded-2xl bg-white/55 p-4 ring-1 ring-white/70 transition hover:bg-white/75 active:scale-[0.99]"
    >
      <span
        className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm"
        style={{ backgroundColor: folder.color }}
      >
        {folder.isPrivate ? (
          <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
            <rect x="3" y="6" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 6V4.5a2 2 0 014 0V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
            <path d="M2 3.5h10M2 7h10M2 10.5h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-slate-900">{folder.name}</div>
        <div className="text-xs text-slate-500">
          {folder.incompleteCount} open · {folder.role}
          {folder.isPrivate ? " · private" : ""}
        </div>
      </div>
      <span className="text-slate-300">›</span>
    </Link>
  );
}
