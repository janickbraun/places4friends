"use client";

import React, { useState } from "react";
import { useAuth } from "./auth/AuthProvider";
import { Mail, AlertCircle, Loader2, CheckCircle } from "lucide-react";

export default function VerificationBanner() {
  const { user, loading, emailVerified } = useAuth();
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  if (loading || !user || emailVerified) {
    return null;
  }

  const handleResend = async () => {
    if (sending || countdown > 0) return;
    setSending(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/verify-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Fehler beim Senden.");
        if (data.error?.includes("warte")) {
          startCountdown(60);
        }
      } else {
        setSuccess("Bestätigungs-E-Mail wurde gesendet.");
        startCountdown(60);
      }
    } catch (err) {
      setError("Verbindung zum Server fehlgeschlagen. Bitte versuche es später noch einmal.");
    } finally {
      setSending(false);
    }
  };

  const startCountdown = (seconds: number) => {
    setCountdown(seconds);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2.5 transition-all duration-300 animate-slide-down">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-amber-800">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 text-amber-600" />
          <span className="text-xs font-medium leading-relaxed text-center sm:text-left">
            Deine E-Mail-Adresse ist noch nicht bestätigt. Bitte verifiziere sie, um dein Konto zu sichern.
          </span>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {success ? (
            <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1 text-[11px] font-semibold">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Gesendet</span>
            </div>
          ) : error ? (
            <button
              onClick={handleResend}
              disabled={sending || countdown > 0}
              className="text-[11px] font-bold text-red-700 hover:text-red-800 underline disabled:opacity-60 disabled:no-underline cursor-pointer"
            >
              {sending ? "Wird gesendet..." : "Fehler. Erneut versuchen?"}
            </button>
          ) : (
            <button
              onClick={handleResend}
              disabled={sending || countdown > 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white px-3 py-1.5 text-[11px] font-bold shadow-sm transition-all active:scale-[0.98] disabled:bg-amber-600/40 disabled:text-amber-800/60 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100 cursor-pointer"
            >
              {sending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Mail className="h-3 w-3" />
              )}
              {countdown > 0 ? `Warte ${countdown}s` : "Erneut senden"}
            </button>
          )}
        </div>
      </div>

      {/* Custom Styles for animation */}
      <style>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-down {
          animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
