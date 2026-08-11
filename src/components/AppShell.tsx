"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { GlassPanel } from "@/components/GlassPanel";
import { Sidebar, FolderListItem } from "@/components/Sidebar";
import { NewFolderSheet } from "@/components/NewFolderSheet";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [owned, setOwned] = useState<FolderListItem[]>([]);
  const [shared, setShared] = useState<FolderListItem[]>([]);
  const [today, setToday] = useState({ points: 0, completions: 0, created: 0 });
  const [pendingFriends, setPendingFriends] = useState(0);
  const [newOpen, setNewOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const refresh = useCallback(async () => {
    const [foldersRes, todayRes, friendsRes] = await Promise.all([
      fetch("/api/folders"),
      fetch("/api/analytics/today"),
      fetch("/api/friends"),
    ]);
    if (foldersRes.ok) {
      const data = await foldersRes.json();
      setOwned(data.owned ?? []);
      setShared(data.shared ?? []);
    }
    if (todayRes.ok) {
      setToday(await todayRes.json());
    }
    if (friendsRes.ok) {
      const data = await friendsRes.json();
      setPendingFriends((data.incoming ?? []).length);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  // Live update Today points / list counts when todos change
  useEffect(() => {
    function onStats() {
      refresh();
    }
    function onDelta(e: Event) {
      const detail = (e as CustomEvent<{ points: number; completions: number; created: number }>)
        .detail;
      if (!detail) return;
      setToday((prev) => ({
        points: Math.max(0, prev.points + (detail.points || 0)),
        completions: Math.max(0, prev.completions + (detail.completions || 0)),
        created: Math.max(0, prev.created + (detail.created || 0)),
      }));
    }
    window.addEventListener("jata:stats-changed", onStats);
    window.addEventListener("jata:stats-delta", onDelta);
    return () => {
      window.removeEventListener("jata:stats-changed", onStats);
      window.removeEventListener("jata:stats-delta", onDelta);
    };
  }, [refresh]);

  // Poll for friend requests so the other user sees them without a hard refresh
  useEffect(() => {
    const id = window.setInterval(() => {
      fetch("/api/friends")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setPendingFriends((data.incoming ?? []).length);
        })
        .catch(() => {});
    }, 8000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    function openNewList() {
      setNewOpen(true);
    }
    window.addEventListener("jata:new-list", openNewList);
    return () => window.removeEventListener("jata:new-list", openNewList);
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col md:flex-row md:gap-2 md:p-4">
      <button
        type="button"
        className="m-3 rounded-xl bg-white/50 px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-white/60 md:hidden"
        onClick={() => setMobileNav((v) => !v)}
      >
        {mobileNav ? "Close" : "Lists"}
        {pendingFriends > 0 && !mobileNav ? (
          <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF3B30] px-1.5 text-[11px] text-white">
            {pendingFriends}
          </span>
        ) : null}
      </button>

      <div className={`${mobileNav ? "block" : "hidden"} md:block md:shrink-0`}>
        <GlassPanel className="flex h-auto flex-col md:h-[calc(100vh-2rem)] md:overflow-hidden">
          <Sidebar
            owned={owned}
            shared={shared}
            today={today}
            pendingFriends={pendingFriends}
            onNewList={() => setNewOpen(true)}
          />
        </GlassPanel>
      </div>

      <main className="min-w-0 flex-1 p-3 md:p-0 md:pl-2">
        <GlassPanel className="min-h-[calc(100vh-5rem)] animate-fade-in p-4 md:min-h-[calc(100vh-2rem)] md:p-6">
          {children}
        </GlassPanel>
      </main>

      <NewFolderSheet
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={() => {
          refresh();
          setMobileNav(false);
        }}
      />
    </div>
  );
}
