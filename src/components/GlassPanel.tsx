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
      className={`rounded-2xl border shadow-[0_8px_32px_rgba(15,40,80,0.08)] backdrop-blur-2xl ${className}`}
      style={{
        backgroundColor: "var(--glass)",
        borderColor: "var(--border)",
      }}
    >
      {children}
    </div>
  );
}
