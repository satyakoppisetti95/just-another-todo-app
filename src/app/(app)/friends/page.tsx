"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Friend = {
  friendshipId: string;
  id: string;
  name: string;
  email: string;
};

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<Friend[]>([]);
  const [outgoing, setOutgoing] = useState<Friend[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/friends");
    if (res.ok) {
      const data = await res.json();
      setFriends(data.friends ?? []);
      setIncoming(data.incoming ?? []);
      setOutgoing(data.outgoing ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 5000);
    return () => window.clearInterval(id);
  }, [load]);

  async function invite(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    setEmail("");
    if (data.status === "accepted") {
      setSuccess("You were already invited — you’re friends now.");
    } else {
      setSuccess(
        "Request sent. They’ll see it under Friends → Incoming requests (in-app only; no email yet)."
      );
    }
    await load();
  }

  async function act(friendshipId: string, action: "accept" | "decline" | "remove") {
    await fetch(`/api/friends/${friendshipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await load();
  }

  return (
    <div className="animate-slide-up">
      <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-slate-900">
        Friends
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Friend requests show up here in-app (red badge on Friends in the sidebar). No email
        notifications yet — the other person should open this page while signed in.
      </p>

      <form onSubmit={invite} className="mt-6 flex flex-wrap gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="friend@email.com"
          required
          className="min-w-[220px] flex-1 rounded-xl border border-slate-200/70 bg-white/70 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/25"
        />
        <button
          type="submit"
          className="rounded-xl bg-[#007AFF] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Add friend
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      {success && <p className="mt-2 text-sm text-emerald-600">{success}</p>}

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="mt-8 space-y-8">
          <section>
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Incoming requests
              {incoming.length > 0 && (
                <span className="rounded-full bg-[#FF3B30] px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-white">
                  {incoming.length}
                </span>
              )}
            </h3>
            {incoming.length === 0 ? (
              <p className="mt-2 rounded-2xl bg-white/40 px-4 py-3 text-sm text-slate-400 ring-1 ring-white/60">
                No pending invites. When someone adds your email, it appears here.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {incoming.map((f) => (
                  <li
                    key={f.friendshipId}
                    className="flex items-center justify-between rounded-2xl bg-amber-50/80 px-4 py-3 ring-1 ring-amber-200/60"
                  >
                    <div>
                      <div className="font-medium text-slate-900">{f.name}</div>
                      <div className="text-xs text-slate-500">{f.email}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => act(f.friendshipId, "accept")}
                        className="rounded-lg bg-[#34C759] px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => act(f.friendshipId, "decline")}
                        className="rounded-lg px-3 py-1.5 text-xs text-slate-500"
                      >
                        Decline
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Friends
            </h3>
            {friends.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">No friends yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {friends.map((f) => (
                  <li
                    key={f.friendshipId}
                    className="flex items-center justify-between rounded-2xl bg-white/55 px-4 py-3 ring-1 ring-white/70"
                  >
                    <Link href={`/friends/${f.id}`} className="min-w-0 flex-1">
                      <div className="font-medium text-slate-900">{f.name}</div>
                      <div className="text-xs text-slate-500">{f.email}</div>
                    </Link>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/friends/${f.id}`}
                        className="text-xs font-medium text-[#007AFF]"
                      >
                        Dashboard
                      </Link>
                      <button
                        type="button"
                        onClick={() => act(f.friendshipId, "remove")}
                        className="text-xs text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Pending sent
            </h3>
            {outgoing.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">No outgoing requests.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {outgoing.map((f) => (
                  <li
                    key={f.friendshipId}
                    className="rounded-2xl bg-white/40 px-4 py-3 text-sm text-slate-600 ring-1 ring-white/60"
                  >
                    Waiting on {f.name} · {f.email}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
