"use client";

import { FormEvent, useState } from "react";
import { FOLDER_COLORS } from "@/lib/constants";

export function NewFolderSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(FOLDER_COLORS[6]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color, isPrivate }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }
      setName("");
      setIsPrivate(false);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 p-4 backdrop-blur-sm sm:items-center">
      <form
        onSubmit={submit}
        className="w-full max-w-md animate-[slideUp_0.25s_ease] rounded-2xl border border-white/50 bg-white/80 p-5 shadow-2xl backdrop-blur-2xl"
      >
        <h2 className="text-lg font-semibold text-slate-900">New List</h2>
        <p className="mt-1 text-sm text-slate-500">Organize reminders like Apple Folders.</p>

        <label className="mt-4 block text-xs font-medium text-slate-500">Name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-sm outline-none ring-blue-500/30 focus:ring-2"
          placeholder="Groceries"
          required
        />

        <label className="mt-4 block text-xs font-medium text-slate-500">Color</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {FOLDER_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-7 w-7 rounded-full transition ${
                color === c ? "ring-2 ring-offset-2 ring-slate-400" : ""
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="rounded"
          />
          Private list (not shareable, still counts toward your score)
        </label>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-[#007AFF] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
