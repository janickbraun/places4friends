"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getLoginErrorMessage } from "@/lib/authErrors";

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
            autoComplete="current-password"
            placeholder="Dein Passwort"
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
