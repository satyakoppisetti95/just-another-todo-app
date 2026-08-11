"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PointsStrip } from "@/components/PointsStrip";
import { AnalyticsCharts } from "@/components/AnalyticsCharts";

type AnalyticsData = {
  today: { points: number; completions: number; created: number };
  series: { date: string; points: number; completions: number }[];
  byFolder: { folderId: string; name: string; color: string; points: number }[];
  selfVsPeer: { self: number; peer: number };
  avgCompletionMs: number | null;
  profile?: { id: string; name: string; email: string } | null;
};

export default function FriendDashboardPage() {
  const params = useParams<{ userId: string }>();
  const [range, setRange] = useState<"week" | "month">("week");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/analytics?range=${range}&userId=${params.userId}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed");
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [range, params.userId]);

  return (
    <div className="animate-slide-up">
      <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-slate-900">
        {data?.profile?.name ?? "Friend"}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Public dashboard (private lists excluded) · {data?.profile?.email}
      </p>

      <div className="mt-5 inline-flex rounded-xl bg-white/50 p-1 ring-1 ring-white/70">
        {(["week", "month"] as const).map((r) => (
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
            {r}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      {loading && <p className="mt-4 text-sm text-slate-500">Loading…</p>}

      {data && !error && (
        <>
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Today
            </p>
            <PointsStrip {...data.today} />
          </div>
          <div className="mt-8">
            <AnalyticsCharts
              series={data.series}
              byFolder={data.byFolder}
              selfVsPeer={data.selfVsPeer}
              avgCompletionMs={data.avgCompletionMs}
            />
          </div>
        </>
      )}
    </div>
  );
}
