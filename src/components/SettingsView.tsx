"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Save, User, AtSign, Bell, Trash2, X, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { authenticatedFetch } from "@/lib/auth/authenticatedFetch";

interface UserProfile {
  id: string;
  email: string;
  name?: string | null;
  username?: string | null;
  notificationsFriendRequests?: boolean;
}

export default function SettingsView({ user }: { user: UserProfile }) {
  const [fullName, setFullName] = useState(user.name ?? "");
  const [username, setUsername] = useState(user.username ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [friendRequestNotifications, setFriendRequestNotifications] = useState(
    user.notificationsFriendRequests ?? true
  );
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const router = useRouter();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleStartOnboarding = () => {
    const storageKey = `p4f_onboarding_step_${user.id}`;
    globalThis.localStorage?.setItem("p4f_onboarding_active", "true");
    globalThis.localStorage?.setItem(storageKey, "0");
    router.push("/");
  };

  const hasChanges = useMemo(() => {
    const nextName = fullName.trim();
    const nextUsername = username.trim();
    const nextEmail = email.trim();
    const baseName = (user.name ?? "").trim();
    const baseUsername = (user.username ?? "").trim();
    const baseEmail = (user.email ?? "").trim();
    const baseNotifications = user.notificationsFriendRequests ?? true;
    return (
      nextName !== baseName ||
      nextUsername !== baseUsername ||
      nextEmail !== baseEmail ||
      friendRequestNotifications !== baseNotifications
    );
  }, [email, friendRequestNotifications, fullName, username, user.email, user.name, user.username, user.notificationsFriendRequests]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasChanges) return;

    setStatus("saving");
    setMessage(null);

    const supabase = createClient();
    const payload = {
      id: user.id,
      full_name: fullName.trim() || null,
      username: username.trim() || null,
      notifications_friend_requests: friendRequestNotifications,
    };

    const emailValue = email.trim();
    const shouldUpdateProfile =
      payload.full_name !== (user.name ?? null) ||
      payload.username !== (user.username ?? null) ||
      payload.notifications_friend_requests !== (user.notificationsFriendRequests ?? true);
    const shouldUpdateEmail = emailValue !== (user.email ?? "");

    if (shouldUpdateProfile) {
      const { error: profileError } = await supabase.from("profiles").upsert(payload, {
        onConflict: "id",
      });

      if (profileError) {
        setStatus("error");
        setMessage("Profil konnte nicht gespeichert werden.");
        return;
      }
    }

    if (shouldUpdateProfile || shouldUpdateEmail) {
      const { error: authError } = await supabase.auth.updateUser({
        email: shouldUpdateEmail ? emailValue : undefined,
        data: {
          full_name: payload.full_name ?? undefined,
          username: payload.username ?? undefined,
        },
      });

      if (authError) {
        setStatus("error");
        setMessage("Login-Daten konnten nicht aktualisiert werden.");
        return;
      }
    }

    setStatus("success");
    setMessage(
      shouldUpdateEmail
        ? "Bitte bestätige die neue E-Mail-Adresse in deinem Postfach."
        : "Gespeichert."
    );
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const response = await authenticatedFetch("/api/user", {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Konto konnte nicht gelöscht werden.");
      }
      
      const { signOutClient } = await import("@/lib/auth/signOutClient");
      await signOutClient();
      router.push("/register");
      router.refresh();
    } catch (error: any) {
      setDeleteError(error.message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/50 pb-24 font-sans">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-center border-b border-slate-100 bg-white px-4">
        <Link
          href="/profile"
          className="absolute left-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 active:scale-95 transition-all"
          aria-label="Zurück"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-sm font-bold text-slate-900">Einstellungen</h1>
        <div className="absolute right-4 flex items-center gap-2 text-xs font-medium text-slate-500">
          {status === "saving" && "Speichert..."}
          {status === "success" && "Gespeichert"}
          {status === "error" && "Fehler"}
        </div>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 space-y-6 px-4 pt-6">
        <section className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Profil</h2>

          <label className="space-y-2 text-xs font-semibold text-slate-600">
            Voller Name
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <User className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Dein Name"
                className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>
          </label>

          <label className="space-y-2 text-xs font-semibold text-slate-600">
            Benutzername
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <AtSign className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="deinname"
                className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>
          </label>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Konto</h2>
          <label className="space-y-2 text-xs font-semibold text-slate-600">
            E-Mail
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <Mail className="h-4 w-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@domain.de"
                className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>
          </label>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Benachrichtigungen</h2>
          <button
            type="button"
            onClick={() => setFriendRequestNotifications((value) => !value)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left"
            aria-pressed={friendRequestNotifications}
          >
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm font-semibold text-slate-800">Freundschaftsanfragen</p>
                <p className="text-xs text-slate-500">Push-Benachrichtigung bei neuen Anfragen</p>
              </div>
            </div>
            <span
              className={`inline-flex h-6 w-11 items-center rounded-full px-1 transition-colors ${
                friendRequestNotifications ? "bg-brand-green-700" : "bg-slate-200"
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  friendRequestNotifications ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </span>
          </button>
          <p className="text-[11px] font-medium text-slate-400">
            Push-Versand ist vorbereitet, wird aber erst aktiv, sobald wir die Systemberechtigung anfragen.
          </p>
        </section>
 
        <section className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Hilfe & Anleitung</h2>
          <p className="text-[11px] font-medium text-slate-500">
            Du kannst die interaktive Tour durch places4friends jederzeit starten, um die wichtigsten Funktionen kennenzulernen.
          </p>
          <button
            type="button"
            onClick={handleStartOnboarding}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-green-200 bg-brand-green-50/50 px-4 py-2.5 text-sm font-semibold text-brand-green-800 shadow-sm transition-all hover:bg-brand-green-100 active:scale-[0.98] cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            Tour starten
          </button>
        </section>

        <section className="space-y-3 rounded-2xl border border-rose-100 bg-rose-50/50 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-rose-500">Gefahrenzone</h2>
          <p className="text-[11px] font-medium text-slate-500">
            Wenn du deinen Account löschst, werden alle deine Daten unwiderruflich gelöscht. Dies kann nicht rückgängig gemacht werden.
          </p>
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 shadow-sm transition-all hover:bg-rose-50 active:scale-[0.98]"
          >
            <Trash2 className="h-4 w-4" />
            Konto löschen
          </button>
        </section>

        {message && (
          <div
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${
              status === "error"
                ? "bg-rose-50 text-rose-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={!hasChanges || status === "saving"}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-green-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Save className="h-4 w-4" />
          Speichern
        </button>
      </form>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-white">
              <h2 className="text-sm font-bold text-rose-600 flex items-center gap-2">
                <AlertTriangle className="h-4.5 w-4.5" />
                Konto wirklich löschen?
              </h2>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 active:scale-95 transition-all cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-600 leading-relaxed">
                Bist du sicher, dass du deinen Account unwiderruflich löschen möchtest? Alle deine Empfehlungen, Freundschaften und Einstellungen werden dauerhaft entfernt. Dieser Schritt kann nicht rückgängig gemacht werden.
              </p>
              {deleteError && (
                <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  {deleteError}
                </div>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isDeleting}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Löschen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
