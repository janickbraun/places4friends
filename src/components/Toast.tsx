"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type ToastVariant = "error" | "info";

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  onDismiss: () => void;
  autoHideMs?: number;
}

const variantClasses: Record<ToastVariant, string> = {
  error: "border-rose-100 bg-rose-50 text-rose-800",
  info: "border-slate-200 bg-white text-slate-800",
};

export default function Toast({
  message,
  variant = "error",
  onDismiss,
  autoHideMs = 6000,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, autoHideMs);
    return () => clearTimeout(timer);
  }, [autoHideMs, message, onDismiss]);

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium shadow-lg backdrop-blur-md ${variantClasses[variant]}`}
    >
      <p className="flex-1 leading-snug">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-lg p-0.5 opacity-70 transition hover:opacity-100"
        aria-label="Hinweis schließen"
      >
        <X className="h-3.5 w-3.5 flex-shrink-0" />
      </button>
    </div>
  );
}
