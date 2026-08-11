import { ReactNode } from "react";

export function GlassPanel({
  children,
  className = "",
  /** Let the page theme show through (needed under iOS PWA status bar) */
  clearMobile = false,
}: {
  children: ReactNode;
  className?: string;
  clearMobile?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border shadow-[0_8px_32px_rgba(15,40,80,0.08)] backdrop-blur-2xl ${
        clearMobile
          ? "border-0 bg-transparent shadow-none backdrop-blur-none md:border md:bg-[color:var(--glass)] md:shadow-[0_8px_32px_rgba(15,40,80,0.08)] md:backdrop-blur-2xl"
          : ""
      } ${className}`}
      style={
        clearMobile
          ? { borderColor: "var(--border)" }
          : {
              backgroundColor: "var(--glass)",
              borderColor: "var(--border)",
            }
      }
    >
      {children}
    </div>
  );
}
