"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type SeriesPoint = { date: string; points: number; completions: number };

export function AnalyticsCharts({
  series,
  byFolder,
  selfVsPeer,
  avgCompletionMs,
}: {
  series: SeriesPoint[];
  byFolder: { folderId: string; name: string; color: string; points: number }[];
  selfVsPeer: { self: number; peer: number };
  avgCompletionMs: number | null;
}) {
  const chartData = series.map((s) => ({
    ...s,
    label: s.date.slice(5),
  }));

  const avgHours =
    avgCompletionMs != null ? Math.round((avgCompletionMs / 3600000) * 10) / 10 : null;

  return (
    <div className="space-y-6">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.5)",
                background: "rgba(255,255,255,0.9)",
                backdropFilter: "blur(12px)",
              }}
            />
            <Bar dataKey="points" fill="#007AFF" radius={[6, 6, 0, 0]} name="Points" />
            <Bar
              dataKey="completions"
              fill="#34C759"
              radius={[6, 6, 0, 0]}
              name="Completions"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/50 p-4 ring-1 ring-white/60">
          <h3 className="text-sm font-semibold text-slate-800">Self vs Peer points</h3>
          <div className="mt-3 flex gap-3">
            <div className="flex-1 rounded-xl bg-blue-50/80 p-3 text-center">
              <div className="text-xl font-semibold text-[#007AFF]">{selfVsPeer.self}</div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Self</div>
            </div>
            <div className="flex-1 rounded-xl bg-emerald-50/80 p-3 text-center">
              <div className="text-xl font-semibold text-[#34C759]">{selfVsPeer.peer}</div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Peer</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/50 p-4 ring-1 ring-white/60">
          <h3 className="text-sm font-semibold text-slate-800">Avg. time to complete</h3>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            {avgHours != null ? `${avgHours}h` : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">From create to check-off</p>
        </div>
      </div>

      {byFolder.length > 0 && (
        <div className="rounded-2xl bg-white/50 p-4 ring-1 ring-white/60">
          <h3 className="text-sm font-semibold text-slate-800">Points by list</h3>
          <ul className="mt-3 space-y-2">
            {byFolder.map((f) => (
              <li key={f.folderId} className="flex items-center gap-3 text-sm">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: f.color }}
                />
                <span className="flex-1 truncate text-slate-700">{f.name}</span>
                <span className="tabular-nums font-medium text-slate-900">{f.points}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
