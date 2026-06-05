"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getLoginErrorMessage } from "@/lib/authErrors";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotStatus, setForgotStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [forgotMessage, setForgotMessage] = useState("");

  useEffect(() => {
    const errorParam = searchParams.get("error");
    const errorCode = searchParams.get("error_code");
    const errorDescription = searchParams.get("error_description");

    if (errorParam) {
      if (errorCode === "otp_expired") {
        setError(
          "Der Link zum Zurücksetzen des Passworts ist abgelaufen oder wurde bereits verwendet. Bitte fordere einen neuen Link an."
        );
      } else if (errorDescription) {
        setError(errorDescription);
      } else {
        setError("Ein Authentifizierungsfehler ist aufgetreten.");
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string)?.trim();
    const password = formData.get("password") as string;

    if (!email || !password) {
      setError("Bitte E-Mail und Passwort eingeben.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(getLoginErrorMessage(authError));
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setForgotStatus("sending");
    setForgotMessage("");

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string)?.trim();

    if (!email) {
      setForgotStatus("error");
      setForgotMessage("Bitte gib deine E-Mail-Adresse ein.");
      return;
    }

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/confirm?next=${encodeURIComponent("/reset-password")}`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (resetError) {
      setForgotStatus("error");
      setForgotMessage(resetError.message || "Es gab ein Problem beim Senden der E-Mail.");
    } else {
      setForgotStatus("success");
      setForgotMessage("Eine E-Mail zum Zurücksetzen deines Passworts wurde gesendet. Bitte überprüfe deinen Posteingang.");
    }
  };

  if (isForgotPassword) {
    return (
      <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="forgot-email"
            className="text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            E-Mail-Adresse
          </label>
          <div className="relative flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm focus-within:border-brand-green-500 focus-within:ring-2 focus-within:ring-brand-green-100 transition-all">
            <Mail className="h-4.5 w-4.5 text-slate-400 mr-2.5" />
            <input
              id="forgot-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="name@beispiel.de"
              maxLength={100}
              className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
            />
          </div>
        </div>

        {/* Message */}
        {forgotMessage && (
          <div
            className={`rounded-lg border px-4 py-2.5 text-xs font-medium ${
              forgotStatus === "error"
                ? "bg-red-50 border-red-100 text-red-700"
                : "bg-emerald-50 border-emerald-100 text-emerald-700"
            }`}
          >
            {forgotMessage}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={forgotStatus === "sending"}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-green-700 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-green-900/10 transition-all hover:bg-brand-green-800 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {forgotStatus === "sending" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Link anfordern
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        {/* Cancel */}
        <button
          type="button"
          onClick={() => {
            setIsForgotPassword(false);
            setForgotStatus("idle");
            setForgotMessage("");
            setError("");
          }}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98] cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zum Login
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email */}
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="text-xs font-semibold uppercase tracking-wider text-slate-400"
        >
          E-Mail
        </label>
        <div className="relative flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm focus-within:border-brand-green-500 focus-within:ring-2 focus-within:ring-brand-green-100 transition-all">
          <Mail className="h-4.5 w-4.5 text-slate-400 mr-2.5" />
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="name@beispiel.de"
            maxLength={100}
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
          />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Passwort
          </label>
          <button
            type="button"
            onClick={() => {
              setIsForgotPassword(true);
              setError("");
            }}
            className="text-xs font-semibold text-brand-green-700 hover:underline cursor-pointer"
          >
            Passwort vergessen?
          </button>
        </div>
        <div className="relative flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm focus-within:border-brand-green-500 focus-within:ring-2 focus-within:ring-brand-green-100 transition-all">
          <Lock className="h-4.5 w-4.5 text-slate-400 mr-2.5" />
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Dein Passwort"
            maxLength={100}
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-2.5 text-xs text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-green-700 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-green-900/10 transition-all hover:bg-brand-green-800 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Anmelden
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
