"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getLoginErrorMessage } from "@/lib/authErrors";
import { safeNextPath } from "@/lib/nextPath";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Where to go after signing in. Set by the friend-invite page so the invite
  // isn't lost when someone opens the link without being logged in.
  const next = safeNextPath(searchParams.get("next")) ?? "/";
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

    router.push(next);
    router.refresh();
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
      },
    });

    if (authError) {
      setError(authError.message || "Fehler bei der Google-Anmeldung.");
      setLoading(false);
    }
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

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-slate-50 px-2.5 text-slate-400 font-semibold tracking-wider">oder</span>
        </div>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Mit Google anmelden
      </button>

      <p className="mt-4 text-center text-[10px] text-slate-400 leading-relaxed max-w-[280px] mx-auto">
        Mit deiner Anmeldung akzeptierst du unsere{" "}
        <Link href="/agb" className="underline hover:text-brand-green-700">
          Nutzungsbedingungen
        </Link>{" "}
        und nimmst die{" "}
        <Link href="/datenschutz" className="underline hover:text-brand-green-700">
          Datenschutzerklärung
        </Link>{" "}
        zur Kenntnis.
      </p>
    </form>
  );
}
