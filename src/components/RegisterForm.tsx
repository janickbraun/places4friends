"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, AtSign, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSignupErrorMessage } from "@/lib/authErrors";

export default function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const canSubmit = acceptedPrivacy && acceptedTerms && !loading;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string)?.trim();
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const fullName = (formData.get("fullName") as string)?.trim();
    const username = (formData.get("username") as string)?.trim();

    if (!email || !password) {
      setError("Bitte E-Mail und Passwort eingeben.");
      setLoading(false);
      return;
    }

    if (email.length > 100) {
      setError("Die E-Mail-Adresse darf maximal 100 Zeichen lang sein.");
      setLoading(false);
      return;
    }

    if (fullName && fullName.length > 50) {
      setError("Der vollständige Name darf maximal 50 Zeichen lang sein.");
      setLoading(false);
      return;
    }

    if (username) {
      if (username.length > 30) {
        setError("Der Benutzername darf maximal 30 Zeichen lang sein.");
        setLoading(false);
        return;
      }
      if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
        setError("Der Benutzername darf nur Buchstaben, Zahlen, Unterstriche und Punkte enthalten.");
        setLoading(false);
        return;
      }
    }

    if (password.length > 100) {
      setError("Das Passwort darf maximal 100 Zeichen lang sein.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwörter stimmen nicht überein.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || undefined,
          username: username || undefined,
        },
      },
    });

    if (authError) {
      setError(getSignupErrorMessage(authError));
      setLoading(false);
      return;
    }

    if (!data.session) {
      setSuccess(
        "Konto erstellt! Bitte prüfe dein E-Mail-Postfach und bestätige deine Adresse."
      );
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

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
            maxLength={100}
            placeholder="name@beispiel.de"
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
          />
        </div>
      </div>

      {/* Full Name */}
      <div className="space-y-1.5">
        <label
          htmlFor="fullName"
          className="text-xs font-semibold uppercase tracking-wider text-slate-400"
        >
          Vollständiger Name
        </label>
        <div className="relative flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm focus-within:border-brand-green-500 focus-within:ring-2 focus-within:ring-brand-green-100 transition-all">
          <User className="h-4.5 w-4.5 text-slate-400 mr-2.5" />
          <input
            id="fullName"
            name="fullName"
            type="text"
            maxLength={50}
            placeholder="Max Mustermann"
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
          />
        </div>
      </div>

      {/* Username */}
      <div className="space-y-1.5">
        <label
          htmlFor="username"
          className="text-xs font-semibold uppercase tracking-wider text-slate-400"
        >
          Benutzername
        </label>
        <div className="relative flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm focus-within:border-brand-green-500 focus-within:ring-2 focus-within:ring-brand-green-100 transition-all">
          <AtSign className="h-4.5 w-4.5 text-slate-400 mr-2.5" />
          <input
            id="username"
            name="username"
            type="text"
            maxLength={30}
            pattern="[a-zA-Z0-9_\.]*"
            title="Der Benutzername darf nur Buchstaben, Zahlen, Unterstriche und Punkte enthalten."
            placeholder="maxmuster"
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
          />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="text-xs font-semibold uppercase tracking-wider text-slate-400"
        >
          Passwort
        </label>
        <div className="relative flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm focus-within:border-brand-green-500 focus-within:ring-2 focus-within:ring-brand-green-100 transition-all">
          <Lock className="h-4.5 w-4.5 text-slate-400 mr-2.5" />
          <input
            id="password"
            name="password"
            type="password"
            required
            maxLength={100}
            placeholder="Mind. 6 Zeichen"
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
          />
        </div>
      </div>

      {/* Confirm Password */}
      <div className="space-y-1.5">
        <label
          htmlFor="confirmPassword"
          className="text-xs font-semibold uppercase tracking-wider text-slate-400"
        >
          Passwort wiederholen
        </label>
        <div className="relative flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm focus-within:border-brand-green-500 focus-within:ring-2 focus-within:ring-brand-green-100 transition-all">
          <Lock className="h-4.5 w-4.5 text-slate-400 mr-2.5" />
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            maxLength={100}
            placeholder="Passwort erneut eingeben"
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

      {success && (
        <div className="rounded-lg bg-brand-green-50 border border-brand-green-200 px-4 py-3 text-xs text-brand-green-800 font-medium leading-relaxed">
          {success}
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptedPrivacy}
            onChange={(e) => setAcceptedPrivacy(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-green-700 focus:ring-brand-green-500"
          />
          <span className="text-xs leading-relaxed text-slate-600">
            Ich habe die{" "}
            <Link href="/datenschutz" className="text-brand-green-700 font-semibold hover:underline">
              Datenschutzerklärung
            </Link>{" "}
            zur Kenntnis genommen.
          </span>
        </label>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-green-700 focus:ring-brand-green-500"
          />
          <span className="text-xs leading-relaxed text-slate-600">
            Ich akzeptiere die{" "}
            <Link href="/agb" className="text-brand-green-700 font-semibold hover:underline">
              Nutzungsbedingungen
            </Link>
            .
          </span>
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-green-700 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-green-900/10 transition-all hover:bg-brand-green-800 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Konto erstellen
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
