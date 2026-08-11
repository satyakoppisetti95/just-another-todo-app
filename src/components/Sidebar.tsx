"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { PointsStrip } from "@/components/PointsStrip";

export type FolderListItem = {
  id: string;
  name: string;
  color: string;
  icon: string;
  isPrivate: boolean;
  role: string;
  incompleteCount: number;
};

export function Sidebar({
  owned,
  shared,
  today,
  pendingFriends = 0,
  onNewList,
}: {
  owned: FolderListItem[];
  shared: FolderListItem[];
  today: { points: number; completions: number; created: number };
  pendingFriends?: number;
  onNewList: () => void;
}) {
  const pathname = usePathname();
  const { data } = useSession();

  return (
    <aside className="flex h-full min-h-0 w-full flex-col gap-4 p-4 md:w-[280px] md:shrink-0">
      <div className="shrink-0">
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-slate-900">
          Just Another Todo
        </h1>
        <p className="mt-0.5 text-xs text-slate-500">
          {data?.user?.name ?? "Your reminders"}
        </p>
      </div>

      <div className="shrink-0">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Today
        </p>
        <PointsStrip {...today} />
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        <Section title="My Lists">
          {owned.map((f) => (
            <FolderLink key={f.id} folder={f} active={pathname === `/lists/${f.id}`} />
          ))}
          {owned.length === 0 && (
            <p className="px-2 text-xs text-slate-400">No lists yet</p>
          )}
          <button
            type="button"
            onClick={onNewList}
            className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-[#007AFF] transition hover:bg-white/50"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#007AFF]/15 text-base leading-none">
              +
            </span>
            New List
          </button>
        </Section>

        <Section title="Shared">
          {shared.map((f) => (
            <FolderLink key={f.id} folder={f} active={pathname === `/lists/${f.id}`} />
          ))}
          {shared.length === 0 && (
            <p className="px-2 text-xs text-slate-400">Nothing shared with you</p>
          )}
        </Section>

        <Section title="Navigate">
          <NavLink href="/lists" active={pathname === "/lists"} label="All Lists" />
          <NavLink
            href="/analytics"
            active={pathname.startsWith("/analytics")}
            label="Analytics"
          />
          <NavLink
            href="/friends"
            active={pathname.startsWith("/friends")}
            label="Friends"
            badge={pendingFriends}
          />
        </Section>
      </nav>

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="shrink-0 rounded-xl px-3 py-2 text-left text-sm text-slate-500 transition hover:bg-white/50"
      >
        Sign out
      </button>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function FolderLink({
  folder,
  active,
}: {
  folder: FolderListItem;
  active: boolean;
}) {
  return (
    <Link
      href={`/lists/${folder.id}`}
      className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition ${
        active ? "bg-white/70 shadow-sm" : "hover:bg-white/40"
      }`}
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
        style={{ backgroundColor: folder.color }}
      >
        {folder.isPrivate ? <LockIcon /> : <ListIcon />}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
        {folder.name}
      </span>
      {folder.incompleteCount > 0 && (
        <span className="text-xs tabular-nums text-slate-400">
          {folder.incompleteCount}
        </span>
      )}
    </Link>
  );
}

function NavLink({
  href,
  active,
  label,
  badge = 0,
}: {
  href: string;
  active: boolean;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-xl px-2.5 py-2 text-sm font-medium transition ${
        active ? "bg-white/70 text-slate-900 shadow-sm" : "text-slate-600 hover:bg-white/40"
      }`}
    >
      <span>{label}</span>
      {badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF3B30] px-1.5 text-[11px] font-semibold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M2 3.5h10M2 7h10M2 10.5h7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="3" y="6" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 6V4.5a2 2 0 014 0V6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
