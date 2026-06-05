"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Save,
  User,
  AtSign,
  Bell,
  Trash2,
  X,
  AlertTriangle,
  Loader2,
  Sparkles,
  Download,
  Lock,
  ChevronRight,
  Shield,
} from "lucide-react";
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
  const searchParams = useSearchParams();
  const action = searchParams.get("action");
  const isResetFlow = action === "reset-password";

  const passwordSectionRef = useRef<HTMLDivElement>(null);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // New Modal States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isDataPrivacyModalOpen, setIsDataPrivacyModalOpen] = useState(false);

  // Auto-open password modal on reset flow
  useEffect(() => {
    if (isResetFlow) {
      setIsPasswordModalOpen(true);
    }
  }, [isResetFlow]);

  const handleStartOnboarding = () => {
    const storageKey = `p4f_onboarding_step_${user.id}`;
    globalThis.localStorage?.setItem("p4f_onboarding_active", "true");
    globalThis.localStorage?.setItem(storageKey, "0");
    router.push("/");
  };

  const hasProfileChanges = useMemo(() => {
    const nextName = fullName.trim();
    const nextUsername = username.trim();
    const nextEmail = email.trim();
    const baseName = (user.name ?? "").trim();
    const baseUsername = (user.username ?? "").trim();
    const baseEmail = (user.email ?? "").trim();
    return (
      nextName !== baseName ||
      nextUsername !== baseUsername ||
      nextEmail !== baseEmail
    );
  }, [fullName, username, email, user]);

  const hasNotificationChanges = useMemo(() => {
    const baseNotifications = user.notificationsFriendRequests ?? true;
    return friendRequestNotifications !== baseNotifications;
  }, [friendRequestNotifications, user]);

  const hasChanges = useMemo(() => {
    return hasProfileChanges || hasNotificationChanges;
  }, [hasProfileChanges, hasNotificationChanges]);

  // Reset states & close modals on successful actions
  useEffect(() => {
    if (status === "success" && message === "Gespeichert.") {
      const timer = setTimeout(() => {
        setIsProfileModalOpen(false);
        setIsNotificationsModalOpen(false);
        setStatus("idle");
        setMessage(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, message]);

  useEffect(() => {
    if (passwordStatus === "success") {
      const timer = setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordStatus("idle");
        setPasswordMessage(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [passwordStatus]);

  const handleCancelProfileEdit = () => {
    setFullName(user.name ?? "");
    setUsername(user.username ?? "");
    setEmail(user.email ?? "");
    setStatus("idle");
    setMessage(null);
    setIsProfileModalOpen(false);
  };

  const handleCancelPasswordEdit = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordStatus("idle");
    setPasswordMessage(null);
    setIsPasswordModalOpen(false);
  };

  const handleCancelNotifications = () => {
    setFriendRequestNotifications(user.notificationsFriendRequests ?? true);
    setStatus("idle");
    setMessage(null);
    setIsNotificationsModalOpen(false);
  };

  const handleCancelDataPrivacy = () => {
    setExportError(null);
    setDeleteError(null);
    setIsDataPrivacyModalOpen(false);
  };

  const openProfileModal = () => {
    setStatus("idle");
    setMessage(null);
    setIsProfileModalOpen(true);
  };

  const openPasswordModal = () => {
    setPasswordStatus("idle");
    setPasswordMessage(null);
    setIsPasswordModalOpen(true);
  };

  const openNotificationsModal = () => {
    setStatus("idle");
    setMessage(null);
    setIsNotificationsModalOpen(true);
  };

  const openDataPrivacyModal = () => {
    setExportError(null);
    setDeleteError(null);
    setIsDataPrivacyModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasChanges) return;

    const trimmedName = fullName.trim();
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (trimmedName.length > 50) {
      setStatus("error");
      setMessage("Der Name darf maximal 50 Zeichen lang sein.");
      return;
    }

    if (trimmedUsername) {
      if (trimmedUsername.length > 30) {
        setStatus("error");
        setMessage("Der Benutzername darf maximal 30 Zeichen lang sein.");
        return;
      }
      if (!/^[a-zA-Z0-9_.]+$/.test(trimmedUsername)) {
        setStatus("error");
        setMessage("Der Benutzername darf nur Buchstaben, Zahlen, Unterstriche und Punkte enthalten.");
        return;
      }
    }

    if (trimmedEmail.length > 100) {
      setStatus("error");
      setMessage("Die E-Mail-Adresse darf maximal 100 Zeichen lang sein.");
      return;
    }

    setStatus("saving");
    setMessage(null);

    const supabase = createClient();
    const payload = {
      id: user.id,
      full_name: trimmedName || null,
      username: trimmedUsername || null,
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

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordStatus("saving");
    setPasswordMessage(null);

    const oldPass = oldPassword.trim();
    const pass = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (!oldPass || !pass || !confirm) {
      setPasswordStatus("error");
      setPasswordMessage("Bitte fülle alle Passwort-Felder aus.");
      return;
    }

    if (oldPass.length > 100 || pass.length > 100 || confirm.length > 100) {
      setPasswordStatus("error");
      setPasswordMessage("Die Passwörter dürfen maximal 100 Zeichen lang sein.");
      return;
    }

    if (pass.length < 6) {
      setPasswordStatus("error");
      setPasswordMessage("Das neue Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }

    if (pass !== confirm) {
      setPasswordStatus("error");
      setPasswordMessage("Die neuen Passwörter stimmen nicht überein.");
      return;
    }

    const supabase = createClient();

    // Verify current password by signing in again
    const { error: reAuthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPass,
    });

    if (reAuthError) {
      setPasswordStatus("error");
      setPasswordMessage("Das alte Passwort ist nicht korrekt.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: pass,
    });

    if (updateError) {
      setPasswordStatus("error");
      setPasswordMessage(updateError.message || "Das Passwort konnte nicht aktualisiert werden.");
      return;
    }

    setPasswordStatus("success");
    setPasswordMessage("Dein Passwort wurde erfolgreich aktualisiert.");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleExportData = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const response = await authenticatedFetch("/api/user/export");
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Export failed.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="([^"]+)"/);
      const filename =
        filenameMatch?.[1] ?? `places4friends-export-${new Date().toISOString().slice(0, 10)}.json`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      setExportError(error instanceof Error ? error.message : "Export fehlgeschlagen.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const response = await authenticatedFetch("/api/user", {
        method: "DELETE",
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
          className="absolute left-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
          aria-label="Zurück"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-sm font-bold text-slate-900">Einstellungen</h1>
        <div className="w-8" />
      </header>

      <div className="flex-grow space-y-6 px-4 pt-6 max-w-2xl mx-auto w-full animate-in fade-in duration-300">
        {/* Reset Flow Header Banner */}
        {isResetFlow && (
          <div className="rounded-2xl border border-brand-green-200 bg-brand-green-50 p-4 text-xs font-medium text-brand-green-800 flex items-start gap-2 shadow-sm animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="h-4.5 w-4.5 text-brand-green-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Passwort zurücksetzen:</span> Bitte gib unten dein neues Passwort ein und bestätige es.
            </div>
          </div>
        )}

        {/* Settings Navigation Menu */}
        <div className="space-y-4">
          {/* Group 1: Account & Sicherheit */}
          <div className="space-y-1.5">
            <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Account & Sicherheit</h3>
            <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] divide-y divide-slate-50">
              <button
                type="button"
                onClick={openProfileModal}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50/80 active:bg-slate-100/50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-green-50 text-brand-green-700 transition-colors group-hover:bg-brand-green-100">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Profil & Account</p>
                    <p className="text-xs text-slate-500">Name, Benutzername und E-Mail ändern</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={openPasswordModal}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50/80 active:bg-slate-100/50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-green-50 text-brand-green-700 transition-colors group-hover:bg-brand-green-100">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Passwort ändern</p>
                    <p className="text-xs text-slate-500">Sicherheitseinstellungen deines Kontos</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Group 2: Präferenzen & Anleitung */}
          <div className="space-y-1.5">
            <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Präferenzen & Anleitung</h3>
            <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] divide-y divide-slate-50">
              <button
                type="button"
                onClick={openNotificationsModal}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50/80 active:bg-slate-100/50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 transition-colors group-hover:bg-slate-100">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Benachrichtigungen</p>
                    <p className="text-xs text-slate-500">Push-Mitteilungen anpassen</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={handleStartOnboarding}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50/80 active:bg-slate-100/50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 transition-colors group-hover:bg-slate-100">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Tour starten</p>
                    <p className="text-xs text-slate-500">Interaktive Anleitung durchlaufen</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Group 3: Daten & Privatsphäre */}
          <div className="space-y-1.5">
            <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Daten & Privatsphäre</h3>
            <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
              <button
                type="button"
                onClick={openDataPrivacyModal}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50/80 active:bg-slate-100/50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 transition-colors group-hover:bg-slate-100">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Daten & Privatsphäre</p>
                    <p className="text-xs text-slate-500">Daten exportieren oder Account löschen</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Profile & Account */}
      {isProfileModalOpen && (
        <div
          onClick={handleCancelProfileEdit}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Profil & Account</h3>
              <button
                type="button"
                onClick={handleCancelProfileEdit}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <label className="space-y-1.5 text-xs font-semibold text-slate-600 block">
                Voller Name
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-brand-green-500 focus-within:bg-white transition-all">
                  <User className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Dein Name"
                    maxLength={50}
                    className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>

              <label className="space-y-1.5 text-xs font-semibold text-slate-600 block">
                Benutzername
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-brand-green-500 focus-within:bg-white transition-all">
                  <AtSign className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="deinname"
                    maxLength={30}
                    pattern="[a-zA-Z0-9_\.]*"
                    title="Der Benutzername darf nur Buchstaben, Zahlen, Unterstriche und Punkte enthalten."
                    className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>

              <label className="space-y-1.5 text-xs font-semibold text-slate-600 block">
                E-Mail
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-brand-green-500 focus-within:bg-white transition-all">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@domain.de"
                    maxLength={100}
                    className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>

              {message && (
                <div
                  className={`rounded-xl px-3 py-2.5 text-xs font-semibold animate-in fade-in duration-200 ${
                    status === "error"
                      ? "bg-rose-50 text-rose-700 border border-rose-100"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  }`}
                >
                  {message}
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelProfileEdit}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={!hasProfileChanges || status === "saving"}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-green-700 py-3 text-xs font-bold text-white shadow-md shadow-brand-green-700/10 transition-all hover:bg-brand-green-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                >
                  {status === "saving" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Speichern
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Change Password */}
      {isPasswordModalOpen && (
        <div
          onClick={handleCancelPasswordEdit}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Lock className="h-4 w-4 text-brand-green-700" />
                Passwort ändern
              </h3>
              <button
                type="button"
                onClick={handleCancelPasswordEdit}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-4">
              <label className="space-y-1.5 text-xs font-semibold text-slate-600 block">
                Altes Passwort
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-brand-green-500 focus-within:bg-white transition-all">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(event) => setOldPassword(event.target.value)}
                    placeholder="Dein aktuelles Passwort"
                    maxLength={100}
                    className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>

              <label className="space-y-1.5 text-xs font-semibold text-slate-600 block">
                Neues Passwort
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-brand-green-500 focus-within:bg-white transition-all">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Mindestens 6 Zeichen"
                    maxLength={100}
                    className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>

              <label className="space-y-1.5 text-xs font-semibold text-slate-600 block">
                Neues Passwort bestätigen
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-brand-green-500 focus-within:bg-white transition-all">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Passwort wiederholen"
                    maxLength={100}
                    className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>

              {passwordMessage && (
                <div
                  className={`rounded-xl px-3 py-2.5 text-xs font-semibold animate-in fade-in duration-200 ${
                    passwordStatus === "error"
                      ? "bg-rose-50 text-rose-700 border border-rose-100"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  }`}
                >
                  {passwordMessage}
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelPasswordEdit}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={
                    passwordStatus === "saving" || !oldPassword || !newPassword || !confirmPassword
                  }
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-green-700 py-3 text-xs font-bold text-white shadow-md shadow-brand-green-700/10 transition-all hover:bg-brand-green-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                >
                  {passwordStatus === "saving" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Speichern
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Notifications */}
      {isNotificationsModalOpen && (
        <div
          onClick={handleCancelNotifications}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bell className="h-4 w-4 text-brand-green-700" />
                Benachrichtigungen
              </h3>
              <button
                type="button"
                onClick={handleCancelNotifications}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <button
                type="button"
                onClick={() => setFriendRequestNotifications((value) => !value)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition-all hover:bg-slate-100/50 cursor-pointer"
                aria-pressed={friendRequestNotifications}
              >
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-slate-400" />
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

              <p className="text-[11px] font-medium text-slate-450 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                Push-Versand ist vorbereitet, wird aber erst aktiv, sobald wir die Systemberechtigung anfragen.
              </p>

              {message && (
                <div
                  className={`rounded-xl px-3 py-2.5 text-xs font-semibold animate-in fade-in duration-200 ${
                    status === "error"
                      ? "bg-rose-50 text-rose-700 border border-rose-100"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  }`}
                >
                  {message}
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelNotifications}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={!hasNotificationChanges || status === "saving"}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-green-700 py-3 text-xs font-bold text-white shadow-md shadow-brand-green-700/10 transition-all hover:bg-brand-green-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                >
                  {status === "saving" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Speichern
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Data & Privacy */}
      {isDataPrivacyModalOpen && (
        <div
          onClick={handleCancelDataPrivacy}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Shield className="h-4 w-4 text-brand-green-700" />
                Daten & Datenschutz
              </h3>
              <button
                type="button"
                onClick={handleCancelDataPrivacy}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-5">
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Daten herunterladen
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Lade eine Kopie aller bei uns gespeicherten Daten als JSON-Datei herunter (Profil,
                  Empfehlungen, Kommentare, Freundschaften, Merkliste und Einladungslinks).
                </p>
                {exportError && (
                  <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 border border-rose-100">
                    {exportError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleExportData}
                  disabled={isExporting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-green-200 bg-brand-green-50/50 px-4 py-2.5 text-xs font-semibold text-brand-green-800 shadow-sm transition-all hover:bg-brand-green-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Daten exportieren
                </button>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-500">Gefahrenzone</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Wenn du deinen Account löschst, werden alle deine Daten unwiderruflich gelöscht. Dies kann
                  nicht rückgängig gemacht werden.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(true);
                    setIsDataPrivacyModalOpen(false);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-semibold text-rose-600 shadow-sm transition-all hover:bg-rose-50 active:scale-[0.98] cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  Konto löschen
                </button>
              </div>
            </div>

            <div className="flex pt-5 mt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCancelDataPrivacy}
                className="w-full rounded-xl border border-slate-200 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
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
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Bist du sicher, dass du deinen Account unwiderruflich löschen möchtest? Alle deine Empfehlungen,
                Freundschaften und Einstellungen werden dauerhaft entfernt. Dieser Schritt kann nicht
                rückgängig gemacht werden.
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
