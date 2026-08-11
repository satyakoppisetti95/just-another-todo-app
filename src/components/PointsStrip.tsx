"use client";

export function PointsStrip({
  points,
  completions,
  created,
}: {
  points: number;
  completions: number;
  created: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Metric label="Points" value={points} accent="#007AFF" />
      <Metric label="Done" value={completions} accent="#34C759" />
      <Metric label="Created" value={created} accent="#FF9500" />
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-xl bg-white/50 px-3 py-2.5 text-center ring-1 ring-white/60">
      <div className="text-lg font-semibold tracking-tight" style={{ color: accent }}>
        {value}
      </div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
    </div>
  );
}
