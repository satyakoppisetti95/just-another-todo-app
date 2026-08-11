"use client";

import { useEffect, useState } from "react";
import { PointsStrip } from "@/components/PointsStrip";
import { AnalyticsCharts } from "@/components/AnalyticsCharts";

type AnalyticsData = {
  range: string;
  today: { points: number; completions: number; created: number };
  series: { date: string; points: number; completions: number }[];
  byFolder: { folderId: string; name: string; color: string; points: number }[];
  selfVsPeer: { self: number; peer: number };
  avgCompletionMs: number | null;
};

export default function AnalyticsPage() {
  const [range, setRange] = useState<"day" | "week" | "month">("week");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?range=${range}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [range]);

  return (
    <div className="animate-slide-up">
      <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-slate-900">
        Analytics
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Points, completions, and how you earn — the core of Just Another Todo.
      </p>

      <div className="mt-5 inline-flex rounded-xl bg-white/50 p-1 ring-1 ring-white/70">
        {(["day", "week", "month"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition ${
              range === r
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {r === "day" ? "Today" : r}
          </button>
        ))}
      </div>

      {data && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Today so far
          </p>
          <PointsStrip {...data.today} />
        </div>
      )}

      <div className="mt-8">
        {loading || !data ? (
          <p className="text-sm text-slate-500">Loading charts…</p>
        ) : (
          <AnalyticsCharts
            series={data.series}
            byFolder={data.byFolder}
            selfVsPeer={data.selfVsPeer}
            avgCompletionMs={data.avgCompletionMs}
          />
        )}
      </div>
    </div>
  );
}
