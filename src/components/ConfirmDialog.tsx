"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Löschen",
  cancelLabel = "Abbrechen",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2
            id="confirm-dialog-title"
            className="text-sm font-bold text-rose-600 flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 disabled:opacity-50"
            aria-label="Dialog schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
