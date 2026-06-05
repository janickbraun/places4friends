"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("saving");
    setMessage(null);

    const pass = password.trim();
    const confirm = confirmPassword.trim();

    if (!pass || !confirm) {
      setStatus("error");
      setMessage("Bitte fülle beide Passwort-Felder aus.");
      return;
    }

    if (pass.length < 6) {
      setStatus("error");
      setMessage("Das Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }

    if (pass.length > 100 || confirm.length > 100) {
      setStatus("error");
      setMessage("Die Passwörter dürfen maximal 100 Zeichen lang sein.");
      return;
    }

    if (pass !== confirm) {
      setStatus("error");
      setMessage("Die Passwörter stimmen nicht überein.");
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: pass,
    });

    if (updateError) {
      setStatus("error");
      setMessage(updateError.message || "Das Passwort konnte nicht aktualisiert werden.");
      return;
    }

    setStatus("success");
    setMessage("Dein Passwort wurde erfolgreich aktualisiert. Du wirst weitergeleitet...");

    // Wait a short moment for the user to see the success message, then redirect
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1500);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Password */}
      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="text-xs font-semibold uppercase tracking-wider text-slate-400"
        >
          Neues Passwort
        </label>
        <div className="relative flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm focus-within:border-brand-green-500 focus-within:ring-2 focus-within:ring-brand-green-100 transition-all">
          <Lock className="h-4.5 w-4.5 text-slate-400 mr-2.5" />
          <input
            id="password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mindestens 6 Zeichen"
            maxLength={100}
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
          />
        </div>
      </div>

      {/* Confirm Password */}
      <div className="space-y-1.5">
        <label
          htmlFor="confirm-password"
          className="text-xs font-semibold uppercase tracking-wider text-slate-400"
        >
          Passwort bestätigen
        </label>
        <div className="relative flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm focus-within:border-brand-green-500 focus-within:ring-2 focus-within:ring-brand-green-100 transition-all">
          <Lock className="h-4.5 w-4.5 text-slate-400 mr-2.5" />
          <input
            id="confirm-password"
            name="confirm-password"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Passwort wiederholen"
            maxLength={100}
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
          />
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-lg border px-4 py-2.5 text-xs font-medium flex items-start gap-2 ${
            status === "error"
              ? "bg-red-50 border-red-100 text-red-700"
              : "bg-emerald-50 border-emerald-100 text-emerald-700"
          }`}
        >
          {status === "error" ? (
            <AlertTriangle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === "saving" || status === "success"}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-green-700 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-green-900/10 transition-all hover:bg-brand-green-800 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {status === "saving" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Passwort aktualisieren
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
