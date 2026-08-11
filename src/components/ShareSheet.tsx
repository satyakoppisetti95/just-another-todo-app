"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/Modal";
import { useConfirm } from "@/components/ModalProvider";

type Share = {
  id: string;
  userId: string;
  role: "collaborator" | "viewer" | string;
  name: string;
  email: string;
};

type Friend = {
  id: string;
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
  const confirm = useConfirm();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [role, setRole] = useState<"collaborator" | "viewer">("collaborator");
  const [shares, setShares] = useState<Share[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || isPrivate) return;
    let cancelled = false;
    setLoadingMeta(true);
    setError("");
    setSelectedIds([]);
    setFriendsOpen(false);

    Promise.all([
      fetch(`/api/folders/${folderId}/shares`).then((r) => r.json()),
      fetch("/api/friends").then((r) => r.json()),
    ])
      .then(([shareData, friendData]) => {
        if (cancelled) return;
        setShares(shareData.shares ?? []);
        setFriends(friendData.friends ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load friends");
      })
      .finally(() => {
        if (!cancelled) setLoadingMeta(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, folderId, isPrivate]);

  useEffect(() => {
    if (!friendsOpen) return;
    function onDocClick(e: MouseEvent) {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setFriendsOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [friendsOpen]);

  const sharedIds = useMemo(() => new Set(shares.map((s) => s.userId)), [shares]);

  const inviteableFriends = useMemo(
    () => friends.filter((f) => !sharedIds.has(f.id)),
    [friends, sharedIds]
  );

  const selectedFriends = useMemo(
    () => inviteableFriends.filter((f) => selectedIds.includes(f.id)),
    [inviteableFriends, selectedIds]
  );

  const triggerLabel =
    selectedFriends.length === 0
      ? "Select friends…"
      : selectedFriends.length === 1
        ? selectedFriends[0].name
        : `${selectedFriends.length} friends selected`;

  function toggleFriend(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function invite(e: FormEvent) {
    e.preventDefault();
    if (selectedIds.length === 0) {
      setError("Select at least one friend");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/folders/${folderId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: selectedIds, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const added = (data.shares ?? []) as Share[];
      setShares((prev) => {
        const map = new Map(prev.map((s) => [s.userId, s]));
        for (const s of added) map.set(s.userId, s);
        return [...map.values()];
      });
      setSelectedIds([]);
      setFriendsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function updateRole(userId: string, nextRole: "collaborator" | "viewer") {
    setError("");
    const res = await fetch(`/api/folders/${folderId}/shares`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: nextRole }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to update permission");
      return;
    }
    setShares((prev) =>
      prev.map((s) => (s.userId === userId ? { ...s, role: data.role } : s))
    );
  }

  async function remove(userId: string, name: string) {
    const ok = await confirm({
      title: "Remove access?",
      message: `${name} will no longer see this list.`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/folders/${folderId}/shares?userId=${userId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError("Failed to remove access");
      return;
    }
    setShares((prev) => prev.filter((s) => s.userId !== userId));
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="share-list-title">
      <h2 id="share-list-title" className="text-lg font-semibold text-[color:var(--foreground)]">
        Share List
      </h2>
      {isPrivate ? (
        <p className="mt-3 text-sm text-[color:var(--muted)]">
          Private lists cannot be shared. Make it public first.
        </p>
      ) : loadingMeta ? (
        <p className="mt-3 text-sm text-[color:var(--muted)]">Loading…</p>
      ) : (
        <>
          <form onSubmit={invite} className="mt-4 space-y-3">
            <div ref={dropdownRef} className="relative">
              <label className="text-xs font-medium text-[color:var(--muted)]">
                Friends
              </label>
              {inviteableFriends.length === 0 ? (
                <p className="mt-1.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--glass)] px-3 py-2.5 text-sm text-[color:var(--muted)]">
                  {friends.length === 0
                    ? "Add friends first from the Friends page."
                    : "All your friends already have access."}
                </p>
              ) : (
                <>
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={friendsOpen}
                    onClick={() => setFriendsOpen((v) => !v)}
                    className="mt-1 flex w-full items-center justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--glass-strong)] px-3 py-2.5 text-left text-sm text-[color:var(--foreground)]"
                  >
                    <span
                      className={
                        selectedFriends.length === 0
                          ? "text-[color:var(--muted)]"
                          : undefined
                      }
                    >
                      {triggerLabel}
                    </span>
                    <span className="ml-2 text-[color:var(--muted)]" aria-hidden>
                      {friendsOpen ? "▴" : "▾"}
                    </span>
                  </button>

                  {friendsOpen && (
                    <ul
                      className="absolute z-20 mt-1 max-h-48 w-full space-y-0.5 overflow-y-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] p-1.5 shadow-lg"
                      role="listbox"
                      aria-multiselectable="true"
                      aria-label="Select friends"
                    >
                      {inviteableFriends.map((f) => {
                        const selected = selectedIds.includes(f.id);
                        return (
                          <li key={f.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={selected}
                              onClick={() => toggleFriend(f.id)}
                              className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition ${
                                selected
                                  ? "bg-[color:var(--accent-soft)]"
                                  : "hover:bg-[color:var(--glass-strong)]"
                              }`}
                            >
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] ${
                                  selected
                                    ? "border-transparent app-bg-accent text-white"
                                    : "border-[color:var(--border)] bg-white/70"
                                }`}
                              >
                                {selected ? "✓" : ""}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-[color:var(--foreground)]">
                                  {f.name}
                                </span>
                                <span className="block truncate text-xs text-[color:var(--muted)]">
                                  {f.email}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-[color:var(--muted)]">
                Permission
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "collaborator" | "viewer")}
                className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--glass-strong)] px-3 py-2.5 text-sm text-[color:var(--foreground)]"
              >
                <option value="collaborator">Collaborator (can add & complete)</option>
                <option value="viewer">Viewer (read only)</option>
              </select>
            </div>

            {error && <p className="text-sm text-[color:var(--danger)]">{error}</p>}

            <button
              type="submit"
              disabled={loading || selectedIds.length === 0}
              className="app-bg-accent w-full rounded-xl py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {loading
                ? "Inviting…"
                : selectedIds.length > 1
                  ? `Invite ${selectedIds.length} friends`
                  : "Invite"}
            </button>
          </form>

          <section className="mt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
              People with access
            </h3>
            {shares.length === 0 ? (
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                No one else has access yet.
              </p>
            ) : (
              <ul className="mt-2 max-h-52 space-y-2 overflow-y-auto">
                {shares.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-xl px-3 py-2.5"
                    style={{
                      backgroundColor: "var(--glass)",
                      boxShadow: "inset 0 0 0 1px var(--border)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-[color:var(--foreground)]">
                          {s.name}
                        </div>
                        <div className="truncate text-xs text-[color:var(--muted)]">
                          {s.email}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(s.userId, s.name)}
                        className="shrink-0 text-xs font-medium text-[color:var(--danger)]"
                      >
                        Remove
                      </button>
                    </div>
                    <select
                      value={s.role === "viewer" ? "viewer" : "collaborator"}
                      onChange={(e) =>
                        updateRole(
                          s.userId,
                          e.target.value as "collaborator" | "viewer"
                        )
                      }
                      className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--glass-strong)] px-2.5 py-1.5 text-xs text-[color:var(--foreground)]"
                      aria-label={`Permission for ${s.name}`}
                    >
                      <option value="collaborator">Collaborator</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
      <button
        type="button"
        onClick={onClose}
        className="mt-4 w-full rounded-xl py-2 text-sm text-[color:var(--muted)] hover:bg-[color:var(--glass)]"
      >
        Done
      </button>
    </Modal>
  );
}
