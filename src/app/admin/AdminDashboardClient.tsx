"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  Users,
  Activity,
  Heart,
  MessageSquare,
  Link2,
  Search,
  Trash2,
  RefreshCw,
  ArrowLeft,
  Calendar,
  MapPin,
  Tag,
  Mail,
  UserCheck,
  Percent,
  Flag,
  Ban,
} from "lucide-react";
import {
  getAdminData,
  deleteActivityAdmin,
  deleteInviteLinkAdmin,
  resolveReportAdmin,
  unbanUserAdmin,
} from "./actions";
import { formatTimestamp, getUserColorClass } from "@/lib/auth/placeFormatting";
import ConfirmDialog from "@/components/ConfirmDialog";
import Toast from "@/components/Toast";
import { getAvatarUrl } from "@/lib/avatar";

type AdminData = Awaited<ReturnType<typeof getAdminData>>;
type Tab = "overview" | "users" | "activities" | "reports" | "invites";

export default function AdminDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  
  // Moderation state
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);
  const [deletingInviteId, setDeletingInviteId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [resolvingReportId, setResolvingReportId] = useState<string | null>(null);
  const [unbanningId, setUnbanningId] = useState<string | null>(null);
  
  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"info" | "error">("info");

  async function loadData(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    setError(null);
    try {
      const res = await getAdminData();
      setData(res);
    } catch (err: any) {
      console.error("Fehler beim Laden der Admin-Daten:", err);
      setError(err.message || "Fehler beim Laden der Admin-Daten.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (message: string, variant: "info" | "error" = "info") => {
    setToastMessage(message);
    setToastVariant(variant);
  };

  const handleModerationDelete = async () => {
    if (!deletingActivityId) return;
    setActionLoading(true);
    try {
      await deleteActivityAdmin(deletingActivityId);
      showToast("Die Empfehlung wurde erfolgreich gelöscht.");
      // Instantly update local data list
      if (data) {
        setData({
          ...data,
          stats: {
            ...data.stats,
            activities: Math.max(0, data.stats.activities - 1),
          },
          activities: data.activities.filter((act) => act.id !== deletingActivityId),
        });
      }
    } catch (err: any) {
      showToast(err.message || "Fehler beim Löschen.", "error");
    } finally {
      setActionLoading(false);
      setDeletingActivityId(null);
    }
  };

  const handleRevokeInvite = async () => {
    if (!deletingInviteId) return;
    setActionLoading(true);
    try {
      await deleteInviteLinkAdmin(deletingInviteId);
      showToast("Der Einladungslink wurde gelöscht.");
      if (data) {
        setData({
          ...data,
          stats: {
            ...data.stats,
            invites: Math.max(0, data.stats.invites - 1),
          },
          invites: data.invites.filter((inv) => inv.id !== deletingInviteId),
        });
      }
    } catch (err: any) {
      showToast(err.message || "Fehler beim Löschen.", "error");
    } finally {
      setActionLoading(false);
      setDeletingInviteId(null);
    }
  };

  const handleResolveReport = async (
    reportId: string,
    action: "ban_user" | "delete_post" | "ignore"
  ) => {
    setResolvingReportId(reportId);
    try {
      const res = await resolveReportAdmin(reportId, action);
      const messages: Record<typeof action, string> = {
        ban_user: "Nutzer gebannt und alle Inhalte entfernt.",
        delete_post: "Beitrag gelöscht.",
        ignore: "Meldung ignoriert.",
      };
      showToast(messages[action]);
      if (data) {
        let remaining = data.reports;
        if (action === "ban_user" && "authorId" in res && res.authorId) {
          remaining = data.reports.filter((rep) => rep.author?.id !== res.authorId);
        } else if (action === "delete_post" && "activityId" in res && res.activityId) {
          remaining = data.reports.filter((rep) => rep.activity?.id !== res.activityId);
        } else {
          remaining = data.reports.filter((rep) => rep.id !== reportId);
        }
        setData({
          ...data,
          reports: remaining,
          stats: { ...data.stats, reportsPending: remaining.length },
        });
      }
    } catch (err: any) {
      showToast(err.message || "Aktion fehlgeschlagen.", "error");
    } finally {
      setResolvingReportId(null);
    }
  };

  const handleUnban = async (userId: string) => {
    setUnbanningId(userId);
    try {
      await unbanUserAdmin(userId);
      showToast("Bann aufgehoben.");
      if (data) {
        setData({
          ...data,
          users: data.users.map((u) => (u.id === userId ? { ...u, banned: false } : u)),
        });
      }
    } catch (err: any) {
      showToast(err.message || "Aktion fehlgeschlagen.", "error");
    } finally {
      setUnbanningId(null);
    }
  };

  // Filter users by search
  const filteredUsers = data?.users.filter((user) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      user.username.toLowerCase().includes(query) ||
      user.full_name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  }) || [];

  // Filter activities by search
  const filteredActivities = data?.activities.filter((act) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      act.place_name.toLowerCase().includes(query) ||
      act.place_address.toLowerCase().includes(query) ||
      act.description.toLowerCase().includes(query) ||
      (act.user && act.user.username.toLowerCase().includes(query)) ||
      (act.user && act.user.full_name.toLowerCase().includes(query))
    );
  }) || [];

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 font-sans pb-20">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-100 bg-white px-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand-green-600" />
            <h1 className="text-sm font-bold text-slate-900">Admin-Bereich</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-green-600 mb-2" />
          <p className="text-xs text-slate-500 font-medium">Lade Admin-Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 font-sans pb-20 page-transition">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-100 bg-white px-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-rose-600" />
            <h1 className="text-sm font-bold text-slate-900">Admin-Bereich</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-medium text-rose-600">{error || "Fehler beim Laden"}</p>
          <button
            onClick={() => loadData()}
            className="mt-4 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  // Get top categories
  const sortedCategories = Object.entries(data.categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const totalCategoryCount = Object.values(data.categoryCounts).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans pb-24 page-transition">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-100 bg-white px-4">
        <div className="flex items-center gap-2">
          <Link href="/profile" className="rounded-lg p-1.5 hover:bg-slate-50 text-slate-500 transition">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-1.5 ml-1">
            <Shield className="h-4 w-4 text-brand-green-600" />
            <h1 className="text-sm font-bold text-slate-900">Admin-Bereich</h1>
          </div>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="rounded-lg p-1.5 hover:bg-slate-50 text-slate-500 transition disabled:opacity-50"
          title="Aktualisieren"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </header>

      {/* Tabs list */}
      <div className="flex border-b border-slate-100 bg-white px-2 py-1 scroll-x no-scrollbar sticky top-14 z-10">
        {[
          { id: "overview", label: "Übersicht" },
          { id: "users", label: "Benutzer" },
          { id: "activities", label: "Beiträge" },
          { id: "reports", label: "Gemeldet" },
          { id: "invites", label: "Einladungen" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as Tab);
              setSearchQuery("");
            }}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === tab.id
                ? "border-brand-green-600 text-brand-green-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab.label}
            {tab.id === "reports" && data.stats.reportsPending > 0 ? (
              <span className="ml-1 inline-flex items-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                {data.stats.reportsPending}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Content wrapper */}
      <main className="flex-1 p-4">
        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-4 page-transition">
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Users card */}
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Benutzer</span>
                  <div className="rounded-xl bg-slate-50 p-2 text-slate-600">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-extrabold text-slate-900 leading-none">{data.stats.users}</h3>
                  <p className="mt-1 text-[10px] text-slate-500">Registriert</p>
                </div>
              </div>

              {/* Recommendations card */}
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Empfehlungen</span>
                  <div className="rounded-xl bg-brand-green-50 p-2 text-brand-green-600">
                    <Activity className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-extrabold text-slate-900 leading-none">{data.stats.activities}</h3>
                  <p className="mt-1 text-[10px] text-slate-500">
                    davon {data.stats.superlikes} Superlikes
                  </p>
                </div>
              </div>

              {/* Wishlist Saves */}
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Merkliste</span>
                  <div className="rounded-xl bg-rose-50 p-2 text-rose-600">
                    <Heart className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-extrabold text-slate-900 leading-none">{data.stats.wishlist}</h3>
                  <p className="mt-1 text-[10px] text-slate-500">Speicherungen</p>
                </div>
              </div>

              {/* Comments count */}
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kommentare</span>
                  <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-extrabold text-slate-900 leading-none">{data.stats.comments}</h3>
                  <p className="mt-1 text-[10px] text-slate-500">Diskussionen</p>
                </div>
              </div>
            </div>

            {/* Friend network stats */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Freundschaftsnetzwerk</h3>
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Bestehende Freundschaften</p>
                  <p className="text-lg font-bold text-slate-800 mt-0.5">{data.stats.acceptedFriendships}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Offene Anfragen</p>
                  <p className="text-lg font-bold text-slate-800 mt-0.5">{data.stats.pendingFriendships}</p>
                </div>
              </div>
            </div>

            {/* Viral Invites stats */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Einladungen & Wachstum</h3>
                <Link2 className="h-4 w-4 text-slate-400" />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="bg-slate-50/50 rounded-xl p-2.5">
                  <p className="text-[9px] text-slate-400 font-medium">Erstellte Links</p>
                  <p className="text-md font-bold text-slate-800 mt-0.5">{data.stats.invites}</p>
                </div>
                <div className="bg-slate-50/50 rounded-xl p-2.5">
                  <p className="text-[9px] text-slate-400 font-medium">Einlösungen</p>
                  <p className="text-md font-bold text-slate-800 mt-0.5">{data.stats.inviteUses}</p>
                </div>
                <div className="bg-slate-50/50 rounded-xl p-2.5">
                  <p className="text-[9px] text-slate-400 font-medium">Ø Einlösungen</p>
                  <p className="text-md font-bold text-slate-800 mt-0.5">
                    {data.stats.invites > 0 ? (data.stats.inviteUses / data.stats.invites).toFixed(1) : "0.0"}
                  </p>
                </div>
              </div>
            </div>

            {/* Top categories breakdown */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Häufigste Kategorien</h3>
              <div className="space-y-2.5 pt-1">
                {sortedCategories.length === 0 ? (
                  <p className="text-center py-4 text-xs text-slate-400">Keine Daten verfügbar.</p>
                ) : (
                  sortedCategories.map(([cat, count]) => {
                    const percentage = Math.round((count / totalCategoryCount) * 100);
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">{cat}</span>
                          <span className="font-bold text-slate-500">{count} ({percentage}%)</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand-green-600"
                            style={{ width: `${Math.max(5, percentage)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Users */}
        {activeTab === "users" && (
          <div className="space-y-4 page-transition">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Benutzer suchen (Name, Username, E-Mail)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs placeholder-slate-400 focus:outline-none focus:border-brand-green-600 transition"
              />
            </div>

            {/* Users list */}
            <div className="space-y-2">
              {filteredUsers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
                  <p className="text-xs text-slate-400">Keine Benutzer gefunden.</p>
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const initials =
                    user.full_name
                      .split(" ")
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase() || "?";
                  
                  return (
                    <div
                      key={user.id}
                      className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {user.avatar_url ? (
                          <img
                            src={getAvatarUrl(user.avatar_url) ?? ""}
                            alt={user.full_name}
                            className="h-10 w-10 rounded-full object-cover bg-slate-100 flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div
                            className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${getUserColorClass(
                              user.id
                            )}`}
                          >
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{user.full_name}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                            @{user.username}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="flex items-center gap-1 text-[9px] text-slate-500">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate max-w-[120px]">{user.email}</span>
                            </span>
                            <span className="flex items-center gap-1 text-[9px] text-slate-500">
                              <Calendar className="h-3 w-3 flex-shrink-0" />
                              <span>{formatTimestamp(user.created_at)}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <div className="rounded-xl bg-brand-green-50 px-2 py-1 text-center">
                          <span className="text-[10px] font-bold text-brand-green-600 block">
                            {user.activityCount}
                          </span>
                          <span className="text-[8px] text-slate-400 block tracking-wider uppercase font-semibold">
                            Orte
                          </span>
                        </div>
                        {user.banned ? (
                          <button
                            onClick={() => handleUnban(user.id)}
                            disabled={unbanningId === user.id}
                            className="flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[9px] font-bold text-rose-600 hover:bg-rose-100 transition disabled:opacity-50"
                            title="Bann aufheben"
                          >
                            <Ban className="h-3 w-3" />
                            {unbanningId === user.id ? "..." : "Entbannen"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Activities / Recommendations */}
        {activeTab === "activities" && (
          <div className="space-y-4 page-transition">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Beiträge filtern (Ort, Creator, Review)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs placeholder-slate-400 focus:outline-none focus:border-brand-green-600 transition"
              />
            </div>

            {/* Activities list */}
            <div className="space-y-3.5">
              {filteredActivities.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
                  <p className="text-xs text-slate-400">Keine Beiträge gefunden.</p>
                </div>
              ) : (
                filteredActivities.map((act) => (
                  <div
                    key={act.id}
                    className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm flex flex-col"
                  >
                    {/* Header info */}
                    <div className="p-3.5 flex items-center justify-between border-b border-slate-50">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                            act.user ? getUserColorClass(act.user.id) : "bg-slate-400"
                          }`}
                        >
                          {act.user
                            ? act.user.full_name
                                .split(" ")
                                .map((n: string) => n[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()
                            : "?"}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            {act.user ? act.user.full_name : "Unbekannter User"}
                          </p>
                          <p className="text-[9px] text-slate-400 font-medium">
                            {formatTimestamp(act.created_at)}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setDeletingActivityId(act.id)}
                        className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 transition"
                        title="Beitrag löschen (moderieren)"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-3.5 space-y-2">
                      <div>
                        <div className="flex items-start gap-1.5 justify-between">
                          <h4 className="text-xs font-extrabold text-slate-800 leading-snug">
                            {act.place_name}
                          </h4>
                          {act.is_superlike && (
                            <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[8px] font-bold text-amber-600 border border-amber-200/50 uppercase flex-shrink-0">
                              Must See
                            </span>
                          )}
                        </div>
                        {act.place_address && (
                          <p className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{act.place_address}</span>
                          </p>
                        )}
                      </div>

                      {act.description && (
                        <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50/50 rounded-xl p-2.5 border border-slate-100/50">
                          &ldquo;{act.description}&rdquo;
                        </p>
                      )}

                      {/* Image previews */}
                      {act.image_urls.length > 0 && (
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          {act.image_urls.slice(0, 2).map((imgUrl, idx) => (
                            <div key={idx} className="aspect-[4/3] rounded-xl bg-slate-100 overflow-hidden border border-slate-100 relative">
                              <img
                                src={
                                  imgUrl.startsWith("http")
                                    ? imgUrl
                                    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/activity-images/${imgUrl}`
                                }
                                alt={act.place_name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Category tags */}
                      {act.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {act.categories.map((cat) => (
                            <span
                              key={cat}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-0.5"
                            >
                              <Tag className="h-2.5 w-2.5" />
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab: Reported content */}
        {activeTab === "reports" && (
          <div className="space-y-4 page-transition">
            <div className="bg-slate-100/50 rounded-2xl p-3 border border-slate-200/50 text-[10px] text-slate-500 leading-relaxed">
              Von Nutzern gemeldete Beiträge. Entscheide pro Meldung: den Autor bannen
              (Login gesperrt + alle Beiträge und Kommentare gelöscht), nur den Beitrag
              löschen, oder die Meldung ignorieren.
            </div>

            <div className="space-y-3.5">
              {data.reports.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
                  <p className="text-xs text-slate-400">Keine offenen Meldungen.</p>
                </div>
              ) : (
                data.reports.map((rep) => {
                  const activity = rep.activity;
                  const author = rep.author;
                  const busy = resolvingReportId === rep.id;
                  return (
                    <div
                      key={rep.id}
                      className="rounded-2xl border border-rose-100 bg-white overflow-hidden shadow-sm"
                    >
                      {/* Reporter + time */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-50 bg-rose-50/40 px-3.5 py-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-600">
                          <Flag className="h-3.5 w-3.5" />
                          Gemeldet von {rep.reporter ? rep.reporter.full_name : "Unbekannt"}
                        </div>
                        <span className="text-[9px] text-slate-400 font-medium">
                          {formatTimestamp(rep.created_at)}
                        </span>
                      </div>

                      {/* Reported post */}
                      {activity ? (
                        <div className="p-3.5 space-y-2">
                          <div>
                            <h4 className="text-xs font-extrabold text-slate-800 leading-snug">
                              {activity.place_name}
                            </h4>
                            <p className="text-[9px] text-slate-400 mt-0.5">
                              von {author ? `${author.full_name} (${author.email})` : "Unbekannt"}
                            </p>
                          </div>
                          {activity.description && (
                            <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50/50 rounded-xl p-2.5 border border-slate-100/50">
                              &ldquo;{activity.description}&rdquo;
                            </p>
                          )}
                          {activity.image_urls.length > 0 && (
                            <div className="grid grid-cols-2 gap-1.5 pt-1">
                              {activity.image_urls.slice(0, 2).map((imgUrl, idx) => (
                                <div
                                  key={idx}
                                  className="aspect-[4/3] rounded-xl bg-slate-100 overflow-hidden border border-slate-100"
                                >
                                  <img
                                    src={
                                      imgUrl.startsWith("http")
                                        ? imgUrl
                                        : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/activity-images/${imgUrl}`
                                    }
                                    alt={activity.place_name}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3.5">
                          <p className="text-[10px] text-slate-400 italic">
                            Beitrag nicht mehr vorhanden.
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 border-t border-slate-50 p-3">
                        <button
                          onClick={() => handleResolveReport(rep.id, "ban_user")}
                          disabled={busy || !author}
                          className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-rose-600 px-2 py-2 text-[10px] font-bold text-white hover:bg-rose-700 transition disabled:opacity-50"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          User bannen
                        </button>
                        <button
                          onClick={() => handleResolveReport(rep.id, "delete_post")}
                          disabled={busy || !activity}
                          className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-slate-900 px-2 py-2 text-[10px] font-bold text-white hover:bg-slate-800 transition disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Beitrag löschen
                        </button>
                        <button
                          onClick={() => handleResolveReport(rep.id, "ignore")}
                          disabled={busy}
                          className="flex-1 rounded-xl border border-slate-200 px-2 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                        >
                          Ignorieren
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Invites */}
        {activeTab === "invites" && (
          <div className="space-y-4 page-transition">
            <div className="bg-slate-100/50 rounded-2xl p-3 border border-slate-200/50 text-[10px] text-slate-500 leading-relaxed">
              Hier siehst du alle erstellten Freundschafts-Einladungslinks. Revokierte (gelöschte) Links können nicht mehr eingelöst werden.
            </div>

            {/* Invites list */}
            <div className="space-y-2.5">
              {data.invites.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
                  <p className="text-xs text-slate-400">Keine Einladungslinks vorhanden.</p>
                </div>
              ) : (
                data.invites.map((inv) => {
                  const isExpired = inv.expires_at ? new Date(inv.expires_at) < new Date() : false;
                  
                  return (
                    <div
                      key={inv.id}
                      className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm space-y-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            Erstellt von {inv.creator ? inv.creator.full_name : "Unbekannt"}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            @{inv.creator ? inv.creator.username : "unbekannt"}
                          </p>
                        </div>
                        <button
                          onClick={() => setDeletingInviteId(inv.id)}
                          className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 transition"
                          title="Einladungslink revokieren"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100/50 flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400 font-semibold uppercase tracking-wider">Token</span>
                          <span className="font-mono font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                            {inv.token}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400 font-semibold uppercase tracking-wider">Nutzung</span>
                          <span className="font-bold text-slate-800">
                            {inv.use_count} / {inv.max_uses} Einlösungen
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400 font-semibold uppercase tracking-wider">Ablauf</span>
                          {inv.expires_at ? (
                            <span
                              className={`font-semibold ${
                                isExpired ? "text-rose-600" : "text-slate-700"
                              }`}
                            >
                              {new Date(inv.expires_at).toLocaleDateString("de-DE", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}{" "}
                              {isExpired ? "(Abgelaufen)" : ""}
                            </span>
                          ) : (
                            <span className="font-semibold text-slate-500">Unbegrenzt</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>

      {/* Confirmation for deleting Activity */}
      <ConfirmDialog
        open={deletingActivityId !== null}
        title="Beitrag moderieren"
        message="Möchtest du diese Empfehlung wirklich dauerhaft aus dem System entfernen? Alle zugehörigen Wunschlisteneinträge und Kommentare werden ebenfalls gelöscht."
        confirmLabel="Unwiderruflich löschen"
        cancelLabel="Abbrechen"
        isLoading={actionLoading}
        onConfirm={handleModerationDelete}
        onCancel={() => setDeletingActivityId(null)}
      />

      {/* Confirmation for revoking Invite Link */}
      <ConfirmDialog
        open={deletingInviteId !== null}
        title="Link revokieren"
        message="Möchtest du diesen Einladungslink wirklich ungültig machen? Er kann danach von niemandem mehr zur Registrierung oder zum Hinzufügen von Freunden verwendet werden."
        confirmLabel="Löschen"
        cancelLabel="Abbrechen"
        isLoading={actionLoading}
        onConfirm={handleRevokeInvite}
        onCancel={() => setDeletingInviteId(null)}
      />

      {/* Toast notifications */}
      {toastMessage && (
        <div className="fixed bottom-20 left-4 right-4 z-[250] max-w-sm mx-auto">
          <Toast
            message={toastMessage}
            variant={toastVariant === "error" ? "error" : "info"}
            onDismiss={() => setToastMessage(null)}
          />
        </div>
      )}
    </div>
  );
}
