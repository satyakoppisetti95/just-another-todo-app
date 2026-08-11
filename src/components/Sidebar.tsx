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
    <aside className="flex h-full min-h-0 w-full flex-col gap-5 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] md:w-[280px] md:shrink-0 md:pt-4">
      <div className="shrink-0">
        <h1 className="font-[family-name:var(--font-display)] text-[28px] font-semibold tracking-tight text-slate-900 md:text-2xl">
          Just Another Todo
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 md:text-xs">
          {data?.user?.name ?? "Your reminders"}
        </p>
      </div>

      <div className="shrink-0">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Today
        </p>
        <PointsStrip {...today} />
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain">
        <Section title="My Lists">
          {owned.map((f) => (
            <FolderLink key={f.id} folder={f} active={pathname === `/lists/${f.id}`} />
          ))}
          {owned.length === 0 && (
            <p className="px-2 py-2 text-sm text-slate-400">No lists yet</p>
          )}
          <button
            type="button"
            onClick={onNewList}
            className="mt-1 flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left text-[15px] font-medium text-[#007AFF] transition active:bg-white/50 md:rounded-xl md:py-2 md:text-sm"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#007AFF]/15 text-lg leading-none md:h-7 md:w-7 md:rounded-lg md:text-base">
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
            <p className="px-2 py-2 text-sm text-slate-400">Nothing shared with you</p>
          )}
        </Section>

        <Section title="Navigate">
          <NavLink
            href="/completed"
            active={pathname.startsWith("/completed")}
            label="Completed"
          />
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
        className="shrink-0 rounded-2xl px-3 py-3 text-left text-[15px] text-slate-500 transition active:bg-white/50 md:rounded-xl md:py-2 md:text-sm"
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
      className={`flex items-center gap-3 rounded-2xl px-2.5 py-2.5 text-[15px] transition active:scale-[0.99] md:rounded-xl md:py-2 md:text-sm ${
        active ? "bg-white/70 shadow-sm" : "active:bg-white/40 md:hover:bg-white/40"
      }`}
    >
      <span
        className="flex h-8 w-8 items-center justify-center rounded-[10px] text-white md:h-7 md:w-7 md:rounded-lg"
        style={{ backgroundColor: folder.color }}
      >
        {folder.isPrivate ? <LockIcon /> : <ListIcon />}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
        {folder.name}
      </span>
      {folder.incompleteCount > 0 && (
        <span className="text-sm tabular-nums text-slate-400 md:text-xs">
          {folder.incompleteCount}
        </span>
      )}
      <ChevronRight className="text-slate-300 md:hidden" />
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
      className={`flex items-center justify-between rounded-2xl px-2.5 py-2.5 text-[15px] font-medium transition active:scale-[0.99] md:rounded-xl md:py-2 md:text-sm ${
        active
          ? "bg-white/70 text-slate-900 shadow-sm"
          : "text-slate-600 active:bg-white/40 md:hover:bg-white/40"
      }`}
    >
      <span>{label}</span>
      <span className="flex items-center gap-2">
        {badge > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF3B30] px-1.5 text-[11px] font-semibold text-white">
            {badge}
          </span>
        )}
        <ChevronRight className="text-slate-300 md:hidden" />
      </span>
    </Link>
  );
}

function ChevronRight({ className = "" }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M5 3l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
