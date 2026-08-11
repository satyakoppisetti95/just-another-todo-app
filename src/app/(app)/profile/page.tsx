"use client";

import { FormEvent, useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "@/components/ThemeProvider";
import { useConfirm } from "@/components/ModalProvider";
import type { ThemeId } from "@/lib/themes";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const { theme, setTheme, themes } = useTheme();
  const confirm = useConfirm();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState("");
  const [nameError, setNameError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.name) setName(d.name);
        if (d.email) setEmail(d.email);
        // Don't call setTheme here — ThemeSync + localStorage own the active theme.
        // Overwriting on every Profile visit was resetting to sky when the DB lag/defaulted.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (session?.user?.name && !name) setName(session.user.name);
    if (session?.user?.email && !email) setEmail(session.user.email);
  }, [session, name, email]);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setNameMsg("");
    setNameError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      await update({ name: data.name });
      setNameMsg("Display name updated");
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSavingName(false);
    }
  }

  async function selectTheme(id: ThemeId) {
    setTheme(id);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: id }),
    });
    if (!res.ok) {
      // Keep local selection; user can retry. Optionally surface error later.
      console.error("Failed to persist theme");
    }
  }

  async function handleSignOut() {
    const ok = await confirm({
      title: "Sign out?",
      message: "You’ll need to sign in again to access your lists.",
      confirmLabel: "Sign out",
      danger: true,
    });
    if (!ok) return;
    await signOut({ callbackUrl: "/login" });
  }

  if (loading) {
    return <p className="text-sm text-[color:var(--muted)]">Loading profile…</p>;
  }

  return (
    <div className="animate-slide-up">
      <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[color:var(--foreground)]">
        Profile
      </h2>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Manage your name, appearance, and account.
      </p>

      <section className="mt-8 rounded-2xl bg-[color:var(--glass)] p-4 ring-1 ring-[color:var(--border)]">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
          Account
        </h3>
        <p className="mt-2 text-sm text-[color:var(--muted)]">{email}</p>

        <form onSubmit={saveName} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-[color:var(--muted)]">
              Display name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
              className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--glass-strong)] px-3 py-2.5 text-sm text-[color:var(--foreground)] outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
            />
          </div>
          {nameError && <p className="text-sm text-[color:var(--danger)]">{nameError}</p>}
          {nameMsg && <p className="text-sm text-[color:var(--success)]">{nameMsg}</p>}
          <button
            type="submit"
            disabled={savingName}
            className="app-bg-accent rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {savingName ? "Saving…" : "Save name"}
          </button>
        </form>
      </section>

      <section className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
          Theme
        </h3>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Pick a look for the whole app.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {themes.map((t) => {
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTheme(t.id)}
                className={`rounded-2xl p-3 text-left ring-1 transition ${
                  active
                    ? "ring-2 ring-[color:var(--accent)] bg-[color:var(--glass-strong)]"
                    : "ring-[color:var(--border)] bg-[color:var(--glass)] hover:bg-[color:var(--glass-strong)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-12 w-16 overflow-hidden rounded-xl ring-1 ring-black/5"
                    aria-hidden
                  >
                    <span className="w-2/3" style={{ background: t.preview.bg }} />
                    <span className="flex w-1/3 flex-col">
                      <span className="flex-1" style={{ background: t.preview.card }} />
                      <span className="h-3" style={{ background: t.preview.accent }} />
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[color:var(--foreground)]">
                      {t.name}
                      {active ? (
                        <span className="app-text-accent ml-2 text-xs font-semibold">Active</span>
                      ) : null}
                    </div>
                    <div className="text-xs text-[color:var(--muted)]">{t.description}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <button
          type="button"
          onClick={handleSignOut}
          className="app-bg-danger w-full rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm sm:w-auto"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
