"use client";

import { ReactNode, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

let modalStack = 0;

type ViewportBox = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function readViewport(): ViewportBox {
  const vv = window.visualViewport;
  if (vv) {
    return {
      top: vv.offsetTop,
      left: vv.offsetLeft,
      width: vv.width,
      height: vv.height,
    };
  }
  return {
    top: 0,
    left: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export function Modal({
  open,
  onClose,
  children,
  labelledBy,
  layer = 100,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
  layer?: number;
}) {
  const [box, setBox] = useState<ViewportBox | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }

    const sync = () => setBox(readViewport());
    sync();

    const vv = window.visualViewport;
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    modalStack += 1;
    const depth = modalStack;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && depth === modalStack) {
        e.stopPropagation();
        onClose();
      }
    }

    // Keep focused fields visible above the keyboard inside the scrollable sheet
    function onFocusIn(e: FocusEvent) {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.matches("input, textarea, select, [contenteditable='true']")) return;
      requestAnimationFrame(() => {
        target.scrollIntoView({ block: "nearest", inline: "nearest" });
      });
    }

    window.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      modalStack = Math.max(0, modalStack - 1);
      document.body.style.overflow = modalStack > 0 ? "hidden" : prevOverflow;
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const frame = box ?? {
    top: 0,
    left: 0,
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  };

  return createPortal(
    <div
      className="flex items-end justify-center p-3 sm:items-center sm:p-4"
      style={{
        position: "fixed",
        top: frame.top,
        left: frame.left,
        width: frame.width,
        height: frame.height,
        zIndex: layer,
      }}
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: "var(--overlay)" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-2xl animate-[slideUp_0.25s_ease]"
        style={{
          zIndex: layer + 1,
          backgroundColor: "var(--modal-bg)",
          borderColor: "var(--border)",
          color: "var(--foreground)",
          // Leave a little breathing room; stay within the visible viewport (above keyboard)
          maxHeight: "min(100%, calc(100% - 0.5rem))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
