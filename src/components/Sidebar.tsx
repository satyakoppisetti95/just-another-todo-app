"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
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
        <h1 className="font-[family-name:var(--font-display)] text-[28px] font-semibold tracking-tight text-[color:var(--foreground)] md:text-2xl">
          Just Another Todo
        </h1>
        <p className="mt-0.5 text-sm text-[color:var(--muted)] md:text-xs">
          {data?.user?.name ?? "Your reminders"}
        </p>
      </div>

      <div className="shrink-0">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
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
            <p className="px-2 py-2 text-sm text-[color:var(--muted)]">No lists yet</p>
          )}
          <button
            type="button"
            onClick={onNewList}
            className="app-text-accent mt-1 flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left text-[15px] font-medium transition active:bg-[color:var(--glass)] md:rounded-xl md:py-2 md:text-sm"
          >
            <span className="app-bg-accent-soft app-text-accent flex h-8 w-8 items-center justify-center rounded-[10px] text-lg leading-none md:h-7 md:w-7 md:rounded-lg md:text-base">
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
            <p className="px-2 py-2 text-sm text-[color:var(--muted)]">
              Nothing shared with you
            </p>
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
          <NavLink
            href="/profile"
            active={pathname.startsWith("/profile")}
            label="Profile"
          />
        </Section>
      </nav>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
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
        active
          ? "bg-[color:var(--glass-strong)] shadow-sm"
          : "active:bg-[color:var(--glass)] md:hover:bg-[color:var(--glass)]"
      }`}
    >
      <span
        className="flex h-8 w-8 items-center justify-center rounded-[10px] text-white md:h-7 md:w-7 md:rounded-lg"
        style={{ backgroundColor: folder.color }}
      >
        {folder.isPrivate ? <LockIcon /> : <ListIcon />}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium text-[color:var(--foreground)]">
        {folder.name}
      </span>
      {folder.incompleteCount > 0 && (
        <span className="text-sm tabular-nums text-[color:var(--muted)] md:text-xs">
          {folder.incompleteCount}
        </span>
      )}
      <ChevronRight className="text-[color:var(--muted)] opacity-50 md:hidden" />
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
          ? "bg-[color:var(--glass-strong)] text-[color:var(--foreground)] shadow-sm"
          : "text-[color:var(--muted)] active:bg-[color:var(--glass)] md:hover:bg-[color:var(--glass)]"
      }`}
    >
      <span>{label}</span>
      <span className="flex items-center gap-2">
        {badge > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--danger)] px-1.5 text-[11px] font-semibold text-white">
            {badge}
          </span>
        )}
        <ChevronRight className="text-[color:var(--muted)] opacity-50 md:hidden" />
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
