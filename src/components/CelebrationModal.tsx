"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import type { DotLottie } from "@lottiefiles/dotlottie-web";
import {
  CELEBRATION_LOTTIE_PATH,
  type CelebrationPayload,
} from "@/lib/celebration";

const FALLBACK_MS = 2200;
const MAX_MS = 4500;

export function CelebrationModal({
  celebration,
  onClose,
}: {
  celebration: CelebrationPayload | null;
  onClose: () => void;
}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [loadState, setLoadState] = useState<"loading" | "ready" | "missing">(
    "loading"
  );

  useEffect(() => {
    if (!celebration) {
      setLoadState("loading");
      return;
    }
    // Try Optimized .lottie first; DotLottie loadError falls back to CSS
    setLoadState("ready");
  }, [celebration]);

  // Safety max close + fallback timing when no animation file
  useEffect(() => {
    if (!celebration) return;
    const ms = loadState === "missing" ? FALLBACK_MS : MAX_MS;
    const id = window.setTimeout(() => onCloseRef.current(), ms);
    return () => window.clearTimeout(id);
  }, [celebration, loadState]);

  if (!celebration || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-6 animate-[fadeIn_0.2s_ease]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-title"
    >
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: "var(--overlay)" }}
        onClick={() => onCloseRef.current()}
      />
      <div
        className="relative w-full max-w-[280px] overflow-hidden rounded-3xl border px-5 pb-6 pt-4 text-center shadow-2xl animate-[slideUp_0.28s_ease]"
        style={{
          backgroundColor: "var(--modal-bg)",
          borderColor: "var(--border)",
          color: "var(--foreground)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex h-36 w-36 items-center justify-center">
          {loadState === "ready" ? (
            <DotLottiePlayer
              src={CELEBRATION_LOTTIE_PATH}
              onComplete={() => onCloseRef.current()}
              onError={() => setLoadState("missing")}
            />
          ) : (
            <FallbackCelebration play={loadState === "missing"} />
          )}
        </div>

        <h2
          id="celebration-title"
          className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight"
        >
          {celebration.message}
        </h2>

        {celebration.title ? (
          <p
            className="mt-1 truncate text-sm"
            style={{ color: "var(--muted)" }}
            title={celebration.title}
          >
            {celebration.title}
          </p>
        ) : null}

        <p
          className="mt-3 text-lg font-semibold tabular-nums"
          style={{ color: "var(--accent)" }}
        >
          +{celebration.points}{" "}
          {celebration.points === 1 ? "point" : "points"}
        </p>
      </div>
    </div>,
    document.body
  );
}

function DotLottiePlayer({
  src,
  onComplete,
  onError,
}: {
  src: string;
  onComplete: () => void;
  onError: () => void;
}) {
  const [player, setPlayer] = useState<DotLottie | null>(null);

  useEffect(() => {
    if (!player) return;

    const handleComplete = () => onComplete();
    const handleLoadError = () => onError();

    player.addEventListener("complete", handleComplete);
    player.addEventListener("loadError", handleLoadError);
    return () => {
      player.removeEventListener("complete", handleComplete);
      player.removeEventListener("loadError", handleLoadError);
    };
  }, [player, onComplete, onError]);

  return (
    <DotLottieReact
      src={src}
      autoplay
      loop={false}
      className="h-full w-full"
      dotLottieRefCallback={setPlayer}
    />
  );
}

function FallbackCelebration({ play }: { play: boolean }) {
  return (
    <div
      className={`celebrate-fallback relative flex h-full w-full items-center justify-center ${
        play ? "is-playing" : "opacity-0"
      }`}
      aria-hidden
    >
      <span className="celebrate-confetti c1" />
      <span className="celebrate-confetti c2" />
      <span className="celebrate-confetti c3" />
      <span className="celebrate-confetti c4" />
      <span className="celebrate-confetti c5" />
      <span className="celebrate-confetti c6" />
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--accent-soft)" }}
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle
            className="celebrate-ring"
            cx="20"
            cy="20"
            r="18"
            stroke="var(--accent)"
            strokeWidth="2.5"
          />
          <path
            className="celebrate-check"
            d="M12 20.5L17.5 26L28 14"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
