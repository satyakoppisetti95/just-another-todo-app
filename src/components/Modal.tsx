"use client";

import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

let modalStack = 0;

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
  useEffect(() => {
    if (!open) return;
    modalStack += 1;
    const depth = modalStack;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && depth === modalStack) {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      modalStack = Math.max(0, modalStack - 1);
      document.body.style.overflow = modalStack > 0 ? "hidden" : prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-end justify-center p-4 sm:items-center"
      style={{ zIndex: layer }}
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="relative w-full max-w-md animate-[slideUp_0.25s_ease] rounded-2xl border border-white/50 bg-white/90 p-5 shadow-2xl backdrop-blur-2xl"
        style={{ zIndex: layer + 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
