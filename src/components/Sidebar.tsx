"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { PointsStrip } from "@/components/PointsStrip";
import { useConfirm } from "@/components/ModalProvider";

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
  today: { points: number; completions: number; pending: number; created: number };
  pendingFriends?: number;
  onNewList: () => void;
}) {
  const pathname = usePathname();
  const { data } = useSession();
  const confirm = useConfirm();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  async function handleSignOut() {
    setMenuOpen(false);
    const ok = await confirm({
      title: "Sign out?",
      message: "You’ll need to sign in again to access your lists.",
      confirmLabel: "Sign out",
      danger: true,
    });
    if (!ok) return;
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col gap-5 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] md:w-[280px] md:shrink-0 md:pt-4">
      <div className="flex shrink-0 items-start gap-3">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="relative -ml-1 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[color:var(--foreground)] transition active:bg-[color:var(--glass)] md:hidden"
          aria-label="Open menu"
        >
          <HamburgerIcon />
          {pendingFriends > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[color:var(--danger)]" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-[family-name:var(--font-display)] text-[28px] font-semibold tracking-tight text-[color:var(--foreground)] md:text-2xl">
            Just Another Todo
          </h1>
        </div>
      </div>

      <div className="shrink-0">
        <p className="mb-2 text-[13px] font-semibold text-[color:var(--foreground)]">
          Today
        </p>
        <PointsStrip {...today} />
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain">
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-[13px] font-semibold text-[color:var(--foreground)]">
              My Lists
            </h2>
            <button
              type="button"
              onClick={onNewList}
              className="app-text-accent rounded-lg px-2 py-1 text-[13px] font-semibold transition active:opacity-60"
            >
              New List
            </button>
          </div>
          <ListGroup>
            {owned.map((f, i) => (
              <FolderLink
                key={f.id}
                folder={f}
                active={pathname === `/lists/${f.id}`}
                showDivider={i < owned.length - 1}
              />
            ))}
            {owned.length === 0 && (
              <p className="px-4 py-3.5 text-sm text-[color:var(--muted)]">No lists yet</p>
            )}
          </ListGroup>
        </section>

        <section>
          <h2 className="mb-2 text-[13px] font-semibold text-[color:var(--foreground)]">
            Shared
          </h2>
          <ListGroup>
            {shared.map((f, i) => (
              <FolderLink
                key={f.id}
                folder={f}
                active={pathname === `/lists/${f.id}`}
                showDivider={i < shared.length - 1}
              />
            ))}
            {shared.length === 0 && (
              <p className="px-4 py-3.5 text-sm text-[color:var(--muted)]">
                Nothing shared with you
              </p>
            )}
          </ListGroup>
        </section>

        {/* Desktop: keep Navigate inline */}
        <section className="hidden md:block">
          <h2 className="mb-2 text-[13px] font-semibold text-[color:var(--foreground)]">
            Navigate
          </h2>
          <ListGroup>
            <NavLink
              href="/completed"
              active={pathname.startsWith("/completed")}
              label="Completed"
              showDivider
            />
            <NavLink
              href="/analytics"
              active={pathname.startsWith("/analytics")}
              label="Analytics"
              showDivider
            />
            <NavLink
              href="/friends"
              active={pathname.startsWith("/friends")}
              label="Friends"
              badge={pendingFriends}
              showDivider
            />
            <NavLink
              href="/profile"
              active={pathname.startsWith("/profile")}
              label="Profile"
              showDivider={false}
            />
          </ListGroup>
        </section>
      </nav>

      {menuOpen && typeof document !== "undefined"
        ? createPortal(
            <MobileMenuDrawer
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              pathname={pathname}
              pendingFriends={pendingFriends}
              userName={data?.user?.name}
              userEmail={data?.user?.email}
              onSignOut={handleSignOut}
            />,
            document.body
          )
        : null}
    </aside>
  );
}

function MobileMenuDrawer({
  onClose,
  pathname,
  pendingFriends,
  userName,
  userEmail,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
  pendingFriends: number;
  userName?: string | null;
  userEmail?: string | null;
  onSignOut: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 animate-[fadeIn_0.2s_ease]"
        style={{ backgroundColor: "var(--overlay)" }}
        onClick={onClose}
      />
      <div
        className="absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col shadow-2xl animate-[slideFromLeft_0.28s_cubic-bezier(0.32,0.72,0,1)]"
        style={{
          backgroundColor: "var(--background)",
          backgroundImage: "var(--bg-surface)",
        }}
      >
        <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
          <p className="text-[17px] font-semibold text-[color:var(--foreground)]">Menu</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[color:var(--muted)] active:bg-[color:var(--glass)]"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          {/* Profile at top */}
          <Link
            href="/profile"
            onClick={onClose}
            className="mb-4 flex items-center gap-3 rounded-[14px] px-3 py-3 transition active:opacity-80"
            style={{
              backgroundColor: "var(--glass-strong)",
              boxShadow: "inset 0 0 0 1px var(--border)",
            }}
          >
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--accent)" }}
            >
              {(userName || userEmail || "?").slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-[color:var(--foreground)]">
                {userName || "Profile"}
              </span>
              {userEmail ? (
                <span className="mt-0.5 block truncate text-xs text-[color:var(--muted)]">
                  {userEmail}
                </span>
              ) : null}
            </span>
            <ChevronRight className="text-[color:var(--muted)] opacity-45" />
          </Link>

          <h2 className="mb-2 text-[13px] font-semibold text-[color:var(--foreground)]">
            Navigate
          </h2>
          <ListGroup>
            <NavLink
              href="/completed"
              active={pathname.startsWith("/completed")}
              label="Completed"
              showDivider
              onNavigate={onClose}
            />
            <NavLink
              href="/analytics"
              active={pathname.startsWith("/analytics")}
              label="Analytics"
              showDivider
              onNavigate={onClose}
            />
            <NavLink
              href="/friends"
              active={pathname.startsWith("/friends")}
              label="Friends"
              badge={pendingFriends}
              showDivider={false}
              onNavigate={onClose}
            />
          </ListGroup>
        </div>

        <div className="shrink-0 border-t px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            type="button"
            onClick={onSignOut}
            className="app-bg-danger w-full rounded-2xl px-4 py-3 text-sm font-semibold"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function ListGroup({ children }: { children: ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-[14px]"
      style={{
        backgroundColor: "var(--glass-strong)",
        boxShadow: "inset 0 0 0 1px var(--border)",
      }}
    >
      {children}
    </div>
  );
}

function FolderLink({
  folder,
  active,
  showDivider,
}: {
  folder: FolderListItem;
  active: boolean;
  showDivider: boolean;
}) {
  return (
    <Link
      href={`/lists/${folder.id}`}
      className={`flex items-center gap-3 px-4 py-3 transition active:opacity-80 ${
        active ? "bg-[color:var(--accent-soft)]" : ""
      } ${showDivider ? "border-b border-[color:var(--border)]" : ""}`}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: folder.color }}
      >
        {folder.isPrivate ? <LockIcon /> : <ListIcon />}
      </span>
      <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-[color:var(--foreground)]">
        {folder.name}
      </span>
      <span className="flex shrink-0 items-center gap-1 text-[15px] tabular-nums text-[color:var(--muted)]">
        {folder.incompleteCount > 0 ? folder.incompleteCount : null}
        <ChevronRight className="opacity-45" />
      </span>
    </Link>
  );
}

function NavLink({
  href,
  active,
  label,
  badge = 0,
  showDivider,
  onNavigate,
}: {
  href: string;
  active: boolean;
  label: string;
  badge?: number;
  showDivider: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-4 py-3 transition active:opacity-80 ${
        active ? "bg-[color:var(--accent-soft)]" : ""
      } ${showDivider ? "border-b border-[color:var(--border)]" : ""}`}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor: "var(--accent-soft)",
          color: "var(--accent)",
        }}
      >
        <NavGlyph label={label} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-[color:var(--foreground)]">
        {label}
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        {badge > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--danger)] px-1.5 text-[11px] font-semibold text-white">
            {badge}
          </span>
        )}
        <ChevronRight className="text-[color:var(--muted)] opacity-45" />
      </span>
    </Link>
  );
}

function NavGlyph({ label }: { label: string }) {
  if (label === "Completed") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M4.5 7.2L6.2 8.9 9.5 5.4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (label === "Analytics") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <path
          d="M3 10V7M7 10V4M11 10V6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (label === "Friends") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="9.5" cy="5.5" r="1.6" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M1.8 11c.4-1.6 1.7-2.5 3.2-2.5s2.8.9 3.2 2.5M8.2 8.7c.9-.3 1.9-.1 2.6.6"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="5" r="2.2" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M2.5 11.5c.5-2 2-3 4.5-3s4 1 4.5 3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path
        d="M4 6.5h14M4 11h14M4 15.5h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M4.5 4.5l9 9M13.5 4.5l-9 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
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
