"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "jata-a2hs-dismissed";

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isWebkit = /WebKit/.test(ua);
  const isOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIOS && isWebkit && !isOtherBrowser;
}

function isStandalone() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari legacy
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function AddToHomeScreenTip() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // ignore
    }
    if (isStandalone()) return;
    if (!isIosSafari()) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  return (
    <div
      className="fixed inset-x-3 z-[60] animate-slide-up rounded-2xl p-3 shadow-[0_12px_40px_rgba(15,40,80,0.18)] backdrop-blur-xl md:left-auto md:right-4 md:w-[360px]"
      style={{
        bottom: "max(0.75rem, env(safe-area-inset-bottom))",
        backgroundColor: "var(--glass-strong)",
        boxShadow: "inset 0 0 0 1px var(--border), 0 12px 40px rgba(15,40,80,0.18)",
        color: "var(--foreground)",
      }}
      role="dialog"
      aria-label="Add to Home Screen"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install on your Home Screen</p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
            Tap <span className="font-semibold">Share</span>{" "}
            <ShareGlyph /> then{" "}
            <span className="font-semibold">Add to Home Screen</span> for an app-like experience.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium"
          style={{ color: "var(--muted)" }}
          aria-label="Dismiss"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function ShareGlyph() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="mx-0.5 inline-block h-3.5 w-3.5 align-[-2px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}
