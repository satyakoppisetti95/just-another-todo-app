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
  const [newOpen, setNewOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const refresh = useCallback(async () => {
    const [foldersRes, todayRes] = await Promise.all([
      fetch("/api/folders"),
      fetch("/api/analytics/today"),
    ]);
    if (foldersRes.ok) {
      const data = await foldersRes.json();
      setOwned(data.owned ?? []);
      setShared(data.shared ?? []);
    }
    if (todayRes.ok) {
      setToday(await todayRes.json());
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col md:flex-row md:gap-2 md:p-4">
      <button
        type="button"
        className="m-3 rounded-xl bg-white/50 px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-white/60 md:hidden"
        onClick={() => setMobileNav((v) => !v)}
      >
        {mobileNav ? "Close" : "Lists"}
      </button>

      <div className={`${mobileNav ? "block" : "hidden"} md:block`}>
        <GlassPanel className="h-auto md:h-[calc(100vh-2rem)] md:overflow-hidden">
          <Sidebar owned={owned} shared={shared} today={today} />
          <div className="px-4 pb-4">
            <button
              type="button"
              onClick={() => setNewOpen(true)}
              className="w-full rounded-xl bg-white/60 py-2.5 text-sm font-medium text-[#007AFF] ring-1 ring-white/70 transition hover:bg-white/80"
            >
              + New List
            </button>
          </div>
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
