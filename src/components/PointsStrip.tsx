"use client";

import type { ReactNode } from "react";

export function PointsStrip({
  points,
  completions,
  pending,
  created,
}: {
  points: number;
  completions: number;
  pending: number;
  created: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <Metric
        label="Points"
        value={points}
        accent="var(--accent)"
        icon={<StarIcon />}
      />
      <Metric
        label="Done"
        value={completions}
        accent="var(--success)"
        icon={<CheckIcon />}
      />
      <Metric
        label="Pending"
        value={pending}
        accent="#5856D6"
        icon={<PendingIcon />}
      />
      <Metric
        label="Created"
        value={created}
        accent="var(--warning)"
        icon={<PlusIcon />}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number;
  accent: string;
  icon: ReactNode;
}) {
  return (
    <div
      className="flex min-h-[88px] flex-col justify-between rounded-[16px] p-2.5"
      style={{
        background: `linear-gradient(160deg, color-mix(in srgb, ${accent} 88%, white) 0%, ${accent} 100%)`,
        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur-sm">
          {icon}
        </span>
        <span className="text-[32px] font-bold leading-none tabular-nums tracking-tight text-white">
          {value}
        </span>
      </div>
      <div className="text-[13px] font-semibold leading-tight text-white">{label}</div>
    </div>
  );
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M7 1.5l1.5 3.2 3.5.4-2.6 2.4.7 3.4L7 9.3l-3.1 1.6.7-3.4L2 5.1l3.5-.4L7 1.5z"
        fill="currentColor"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M3.5 7.2L5.8 9.5 10.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PendingIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M7 4.2v3.2l2 1.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M7 3v8M3 7h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
