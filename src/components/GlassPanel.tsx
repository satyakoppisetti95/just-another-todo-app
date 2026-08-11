import { ReactNode } from "react";

export function GlassPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/40 bg-white/45 shadow-[0_8px_32px_rgba(15,40,80,0.08)] backdrop-blur-2xl ${className}`}
    >
      {children}
    </div>
  );
}
