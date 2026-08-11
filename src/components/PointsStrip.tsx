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
      <Metric label="Points" value={points} accent="var(--accent)" />
      <Metric label="Done" value={completions} accent="var(--success)" />
      <Metric label="Created" value={created} accent="var(--warning)" />
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
    <div
      className="rounded-xl px-3 py-2.5 text-center"
      style={{
        backgroundColor: "var(--glass-strong)",
        boxShadow: "inset 0 0 0 1px var(--border)",
      }}
    >
      <div className="text-lg font-semibold tracking-tight" style={{ color: accent }}>
        {value}
      </div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--muted)]">
        {label}
      </div>
    </div>
  );
}
