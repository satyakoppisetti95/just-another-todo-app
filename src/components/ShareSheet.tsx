"use client";

import { FormEvent, useEffect, useState } from "react";

type Share = {
  id: string;
  userId: string;
  role: string;
  name: string;
  email: string;
};

export function ShareSheet({
  open,
  folderId,
  isPrivate,
  onClose,
}: {
  open: boolean;
  folderId: string;
  isPrivate: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"collaborator" | "viewer">("collaborator");
  const [shares, setShares] = useState<Share[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || isPrivate) return;
    fetch(`/api/folders/${folderId}/shares`)
      .then((r) => r.json())
      .then((d) => setShares(d.shares ?? []));
  }, [open, folderId, isPrivate]);

  if (!open) return null;

  async function invite(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/folders/${folderId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setShares((prev) => {
        const without = prev.filter((s) => s.userId !== data.userId);
        return [...without, data];
      });
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function remove(userId: string) {
    await fetch(`/api/folders/${folderId}/shares?userId=${userId}`, {
      method: "DELETE",
    });
    setShares((prev) => prev.filter((s) => s.userId !== userId));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-white/50 bg-white/80 p-5 shadow-2xl backdrop-blur-2xl">
        <h2 className="text-lg font-semibold text-slate-900">Share List</h2>
        {isPrivate ? (
          <p className="mt-3 text-sm text-slate-500">
            Private lists cannot be shared. Make it public first.
          </p>
        ) : (
          <>
            <form onSubmit={invite} className="mt-4 space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="friend@email.com"
                required
                className="w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "collaborator" | "viewer")}
                className="w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-sm"
              >
                <option value="collaborator">Collaborator (can add & complete)</option>
                <option value="viewer">Viewer (read only)</option>
              </select>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#007AFF] py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {loading ? "Inviting…" : "Invite"}
              </button>
            </form>

            <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto">
              {shares.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-xl bg-white/60 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium text-slate-800">{s.name}</div>
                    <div className="text-xs text-slate-400">
                      {s.email} · {s.role}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(s.userId)}
                    className="text-xs text-red-500"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          Done
        </button>
      </div>
    </div>
  );
}
