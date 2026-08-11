"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { GlassPanel } from "@/components/GlassPanel";
import { Sidebar, FolderListItem } from "@/components/Sidebar";
import { NewFolderSheet } from "@/components/NewFolderSheet";
import { AddToHomeScreenTip } from "@/components/AddToHomeScreenTip";

function isHomePath(pathname: string) {
  return pathname === "/lists" || pathname === "/";
}

function backTarget(pathname: string) {
  if (pathname.startsWith("/friends/") && pathname !== "/friends") return "/friends";
  return "/lists";
}

function backLabel(pathname: string) {
  if (pathname.startsWith("/friends/") && pathname !== "/friends") return "Friends";
  return "Home";
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [owned, setOwned] = useState<FolderListItem[]>([]);
  const [shared, setShared] = useState<FolderListItem[]>([]);
  const [today, setToday] = useState({
    points: 0,
    completions: 0,
    pending: 0,
    created: 0,
  });
  const [pendingFriends, setPendingFriends] = useState(0);
  const [newOpen, setNewOpen] = useState(false);
  const [overlayKey, setOverlayKey] = useState(0);

  const home = isHomePath(pathname);
  const showMobileOverlay = isDesktop === false && !home;
  const showDesktopMain = isDesktop === true;

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

  useEffect(() => {
    if (!home) setOverlayKey((k) => k + 1);
  }, [pathname, home]);

  useEffect(() => {
    function onStats() {
      refresh();
    }
    function onDelta(e: Event) {
      const detail = (
        e as CustomEvent<{
          points: number;
          completions: number;
          pending?: number;
          created: number;
        }>
      ).detail;
      if (!detail) return;
      setToday((prev) => ({
        points: Math.max(0, prev.points + (detail.points || 0)),
        completions: Math.max(0, prev.completions + (detail.completions || 0)),
        pending: Math.max(0, prev.pending + (detail.pending || 0)),
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

  // Lock body scroll when mobile overlay is open
  useEffect(() => {
    if (!showMobileOverlay) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showMobileOverlay]);

  function goBack() {
    router.push(backTarget(pathname));
  }

  return (
    <div
      className="mx-auto min-h-dvh max-w-6xl md:flex md:gap-2 md:p-4"
      style={{ background: "var(--bg-surface)" }}
    >
      {/* Home / sidebar — base layer on mobile */}
      <div
        className={`md:block md:shrink-0 ${
          showMobileOverlay ? "pointer-events-none select-none" : ""
        }`}
        aria-hidden={showMobileOverlay || undefined}
      >
        <div
          className={`h-dvh transition-transform duration-300 ease-out md:h-[calc(100vh-2rem)] ${
            showMobileOverlay ? "scale-[0.94] opacity-70" : "scale-100 opacity-100"
          }`}
        >
          <GlassPanel
            clearMobile
            className="flex h-full flex-col overflow-hidden rounded-none border-0 shadow-none md:rounded-2xl md:border-white/40"
          >
            <Sidebar
              owned={owned}
              shared={shared}
              today={today}
              pendingFriends={pendingFriends}
              onNewList={() => setNewOpen(true)}
            />
          </GlassPanel>
        </div>
      </div>

      {/* Desktop main */}
      {showDesktopMain && (
        <main className="min-w-0 flex-1 md:pl-2">
          <GlassPanel className="min-h-[calc(100vh-2rem)] animate-fade-in p-6">
            {children}
          </GlassPanel>
        </main>
      )}

      {/* Mobile detail overlay */}
      {showMobileOverlay && (
        <div
          key={overlayKey}
          className="fixed inset-0 z-40 flex flex-col animate-slide-from-right"
          style={{ backgroundColor: "var(--background)" }}
        >
          <header
            className="flex shrink-0 items-center gap-1 px-1 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]"
            style={{ backgroundColor: "var(--background)" }}
          >
            <button
              type="button"
              onClick={goBack}
              className="app-text-accent flex items-center gap-0.5 rounded-xl px-2 py-2 text-[17px] font-medium active:opacity-60"
            >
              <ChevronLeft />
              {backLabel(pathname)}
            </button>
          </header>
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
            style={{ background: "var(--bg-surface)" }}
          >
            <div
              className="rounded-2xl border p-4 shadow-[0_8px_32px_rgba(15,40,80,0.08)] backdrop-blur-2xl"
              style={{
                backgroundColor: "var(--glass)",
                borderColor: "var(--border)",
              }}
            >
              {children}
            </div>
          </div>
        </div>
      )}

      {/* Avoid flash on first paint before media query resolves */}
      {isDesktop === null && !home && (
        <main
          className="fixed inset-0 z-40 flex flex-col md:static md:z-auto md:min-w-0 md:flex-1 md:pl-2"
          style={{ backgroundColor: "var(--background)" }}
        >
          <header
            className="flex shrink-0 items-center px-1 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:hidden"
            style={{ backgroundColor: "var(--background)" }}
          >
            <button
              type="button"
              onClick={goBack}
              className="app-text-accent flex items-center gap-0.5 rounded-xl px-2 py-2 text-[17px] font-medium"
            >
              <ChevronLeft />
              {backLabel(pathname)}
            </button>
          </header>
          <div
            className="min-h-0 flex-1 overflow-y-auto p-3 md:bg-transparent md:p-0"
            style={{ background: "var(--bg-surface)" }}
          >
            <GlassPanel className="min-h-[60vh] p-4 md:min-h-[calc(100vh-2rem)] md:p-6">
              {children}
            </GlassPanel>
          </div>
        </main>
      )}

      <NewFolderSheet
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={() => {
          refresh();
        }}
      />
      <AddToHomeScreenTip />
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M12.5 4.5L7 10l5.5 5.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
