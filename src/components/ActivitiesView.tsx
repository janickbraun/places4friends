"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Compass, Bookmark, MessageCircle, Loader2, X, MoreVertical, Pencil, Trash2 } from "lucide-react";
import ActivityCard from "./ActivityCard";
import { createClient } from "@/lib/supabase/client";
import { authenticatedFetch } from "@/lib/auth/authenticatedFetch";
import ConfirmDialog from "@/components/ConfirmDialog";

interface FriendInfo {
  id: string;
  name: string;
  username: string;
  initials: string;
  color: string;
  avatarUrl?: string | null;
}

interface ActivityComment {
  id: string;
  userId: string;
  userName: string;
  userInitials: string;
  userColor: string;
  userAvatarUrl?: string | null;
  content: string;
  createdAt: string;
}

interface ActivityItem {
  id: string;
  placeName: string;
  isMustSee: boolean;
  description: string;
  categories: string[];
  timestamp: string;
  friend: FriendInfo;
  latitude?: number | null;
  longitude?: number | null;
  imageUrls?: string[];
  commentCount?: number;
  saveCount?: number;
}

export default function ActivitiesView({
  activities = [],
  initialWishlistedIds = [],
}: {
  activities?: ActivityItem[];
  initialWishlistedIds?: string[];
}) {
  const supabase = createClient();
  const [wishlistIds, setWishlistIds] = useState<string[]>(initialWishlistedIds);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeActivity, setActiveActivity] = useState<ActivityItem | null>(null);
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(() => {
    const initialCounts: Record<string, number> = {};
    activities.forEach((act) => {
      initialCounts[act.id] = act.commentCount ?? 0;
    });
    return initialCounts;
  });
  const [saveCounts, setSaveCounts] = useState<Record<string, number>>(() => {
    const initialCounts: Record<string, number> = {};
    activities.forEach((act) => {
      initialCounts[act.id] = act.saveCount ?? 0;
    });
    return initialCounts;
  });
  const [commentInput, setCommentInput] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isCommentSaving, setIsCommentSaving] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentInput, setEditingCommentInput] = useState("");
  const [commentDeletingId, setCommentDeletingId] = useState<string | null>(null);
  const [commentDeleteConfirm, setCommentDeleteConfirm] = useState<{
    activityId: string;
    commentId: string;
  } | null>(null);
  const [activeCommentMenuId, setActiveCommentMenuId] = useState<string | null>(null);

  useEffect(() => {
    setWishlistIds(initialWishlistedIds);
  }, [initialWishlistedIds]);

  useEffect(() => {
    const nextCommentCounts: Record<string, number> = {};
    const nextSaveCounts: Record<string, number> = {};
    activities.forEach((act) => {
      nextCommentCounts[act.id] = act.commentCount ?? 0;
      nextSaveCounts[act.id] = act.saveCount ?? 0;
    });
    setCommentCounts(nextCommentCounts);
    setSaveCounts(nextSaveCounts);
  }, [activities]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, [supabase]);

  const adjustSaveCount = (activityId: string, delta: number) => {
    setSaveCounts((prev) => ({
      ...prev,
      [activityId]: Math.max(0, (prev[activityId] ?? 0) + delta),
    }));
  };

  const toggleWishlist = async (activityId: string) => {
    const isSaved = wishlistIds.includes(activityId);
    if (isSaved) {
      setWishlistIds((prev) => prev.filter((id) => id !== activityId));
      adjustSaveCount(activityId, -1);
      try {
        const response = await authenticatedFetch(`/api/wishlist?activityId=${activityId}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error();
      } catch (err) {
        setWishlistIds((prev) => [...prev, activityId]);
        adjustSaveCount(activityId, 1);
      }
    } else {
      setWishlistIds((prev) => [...prev, activityId]);
      adjustSaveCount(activityId, 1);
      try {
        const response = await authenticatedFetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activityId }),
        });
        if (!response.ok) throw new Error();
      } catch (err) {
        setWishlistIds((prev) => prev.filter((id) => id !== activityId));
        adjustSaveCount(activityId, -1);
      }
    }
  };

  const getAvatarPublicUrl = (path?: string | null) => {
    if (!path) return null;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return `${data.publicUrl}?t=${Date.now()}`;
  };

  const getUserColorClass = (id: string): string => {
    const colors = [
      "bg-emerald-600",
      "bg-rose-500",
      "bg-amber-600",
      "bg-blue-600",
      "bg-indigo-600",
      "bg-violet-600",
      "bg-fuchsia-600",
      "bg-cyan-600",
    ];
    let sum = 0;
    for (let i = 0; i < id.length; i++) {
      sum += id.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  const fetchComments = async (activityId: string) => {
    setIsCommentsLoading(true);
    setCommentError(null);

    const { data, error } = await supabase
      .from("activity_comments")
      .select(
        "id, content, created_at, user_id, profiles:profiles!activity_comments_user_id_fkey(id, username, full_name, avatar_url)"
      )
      .eq("activity_id", activityId)
      .order("created_at", { ascending: true });

    if (error) {
      setComments([]);
      setCommentError("Kommentare konnten nicht geladen werden.");
    } else {
      const loaded = (data || []).map((row: any) => {
        const profile = row.profiles;
        const name = profile?.full_name ?? profile?.username ?? "Nutzer";
        const initials = name
          .split(" ")
          .map((n: string) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase() || "?";
        const avatarUrl = getAvatarPublicUrl(profile?.avatar_url);

        return {
          id: row.id,
          userId: row.user_id,
          userName: name,
          userInitials: initials,
          userColor: getUserColorClass(row.user_id),
          userAvatarUrl: avatarUrl,
          content: row.content,
          createdAt: row.created_at,
        } as ActivityComment;
      });
      setComments(loaded);
      setCommentCounts((prev) => ({
        ...prev,
        [activityId]: loaded.length,
      }));
    }

    setIsCommentsLoading(false);
  };

  const toggleComments = async (activity: ActivityItem) => {
    if (activeActivity?.id === activity.id) {
      setActiveActivity(null);
      setComments([]);
      setCommentInput("");
      setCommentError(null);
      return;
    }

    setActiveActivity(activity);
    setCommentInput("");
    await fetchComments(activity.id);
  };

  const handleAddComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId || !activeActivity) return;
    const trimmed = commentInput.trim();
    if (!trimmed) {
      setCommentError("Kommentar fehlt.");
      return;
    }

    setIsCommentSaving(true);
    setCommentError(null);

    const { error } = await supabase.from("activity_comments").insert({
      activity_id: activeActivity.id,
      user_id: userId,
      content: trimmed,
    });

    if (error) {
      setCommentError("Kommentar konnte nicht gespeichert werden.");
    } else {
      setCommentInput("");
      await fetchComments(activeActivity.id);
    }

    setIsCommentSaving(false);
  };

  const startEditComment = (comment: ActivityComment) => {
    setEditingCommentId(comment.id);
    setEditingCommentInput(comment.content);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentInput("");
  };

  const handleUpdateComment = async (activityId: string, commentId: string) => {
    const content = editingCommentInput.trim();
    if (!content) {
      setCommentError("Kommentar fehlt.");
      return;
    }

    setIsCommentSaving(true);
    setCommentError(null);

    const { error } = await supabase
      .from("activity_comments")
      .update({ content })
      .eq("id", commentId);

    if (error) {
      setCommentError("Kommentar konnte nicht gespeichert werden.");
    } else {
      cancelEditComment();
      await fetchComments(activityId);
    }

    setIsCommentSaving(false);
  };

  const handleDeleteComment = async (activityId: string, commentId: string) => {
    setCommentDeletingId(commentId);
    setCommentError(null);

    const { error } = await supabase
      .from("activity_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      setCommentError("Kommentar konnte nicht gelöscht werden.");
    } else {
      await fetchComments(activityId);
    }

    setCommentDeletingId(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-center border-b border-slate-100 bg-white px-4">
        <h1 className="text-sm font-bold text-slate-900">Aktivitäten</h1>
      </header>

      <div className="flex-grow overflow-y-auto px-4 pt-6 page-transition">
        {/* Activities List */}
        <div className="space-y-4 pb-8">
          {activities.length > 0 ? (
            activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                id={activity.id}
                placeName={activity.placeName}
                latitude={activity.latitude}
                longitude={activity.longitude}
                isMustSee={activity.isMustSee}
                description={activity.description}
                categories={activity.categories}
                timestamp={activity.timestamp}
                friend={activity.friend}
                imageUrls={activity.imageUrls}
                bottomLeftActions={
                  <>
                    <button
                      onClick={() => toggleWishlist(activity.id)}
                      className={`flex items-center gap-1.5 justify-center active:scale-90 transition-all cursor-pointer p-1 ${
                        wishlistIds.includes(activity.id)
                          ? "text-brand-green-700"
                          : "text-slate-500 hover:text-brand-green-800"
                      }`}
                      title={wishlistIds.includes(activity.id) ? "Aus Wishlist entfernen" : "In Wishlist speichern"}
                    >
                      <Bookmark
                        className="h-5 w-5 transition-colors"
                        fill={wishlistIds.includes(activity.id) ? "currentColor" : "none"}
                      />
                      {(saveCounts[activity.id] ?? 0) > 0 && (
                        <span className="text-[11px] font-semibold select-none">
                          {saveCounts[activity.id]}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleComments(activity)}
                      className="flex items-center gap-1.5 justify-center text-slate-500 hover:text-brand-green-800 active:scale-90 transition-all cursor-pointer p-1"
                      title="Kommentare"
                    >
                      <MessageCircle className="h-4.5 w-4.5 transition-colors" />
                      {(commentCounts[activity.id] ?? 0) > 0 && (
                        <span className="text-[11px] font-semibold select-none">
                          {commentCounts[activity.id]}
                        </span>
                      )}
                    </button>
                  </>
                }
              >

                {activeActivity?.id === activity.id && (
                  <div className="mt-4 pt-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-semibold uppercase tracking-wide">Kommentare</span>
                    </div>

                    {commentError && (
                      <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-2.5 py-2 text-[10px] text-red-700">
                        {commentError}
                      </div>
                    )}

                    {isCommentsLoading ? (
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Kommentare werden geladen...
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="mt-2 text-[11px] text-slate-500">Noch keine Kommentare.</div>                     ) : (
                      <div className="mt-3 space-y-3">
                        {comments.map((comment) => (
                          <div key={comment.id} className="flex gap-2">
                            <Link href={`/profile/${comment.userId}`} className="flex-shrink-0 hover:opacity-80 active:scale-[0.98] transition-all cursor-pointer">
                              <div className={`flex h-6 w-6 items-center justify-center overflow-hidden rounded-full font-bold text-[9px] flex-shrink-0 ${
                                comment.userAvatarUrl 
                                  ? "bg-gradient-to-tr from-brand-green-700 to-brand-green-500 text-white" 
                                  : `${comment.userColor} text-white`
                              }`}>
                                {comment.userAvatarUrl ? (
                                  <img
                                    src={comment.userAvatarUrl}
                                    alt="Profilbild"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  comment.userInitials
                                )}
                              </div>
                            </Link>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Link href={`/profile/${comment.userId}`} className="hover:text-brand-green-700 hover:underline cursor-pointer">
                                  <span className="text-[11px] font-semibold text-slate-700">
                                    {comment.userName}
                                  </span>
                                </Link>
                                <span className="text-[9px] text-slate-400">
                                  {formatCommentTimestamp(comment.createdAt)}
                                </span>
                                {userId === comment.userId && editingCommentId !== comment.id && (
                                  <div className="ml-auto relative">
                                    <button
                                      type="button"
                                      onClick={() => setActiveCommentMenuId(activeCommentMenuId === comment.id ? null : comment.id)}
                                      className="flex h-5 w-5 items-center justify-center rounded-lg text-slate-450 hover:bg-slate-50 hover:text-slate-700 transition-all cursor-pointer"
                                      title="Kommentaroptionen"
                                    >
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    </button>

                                    {activeCommentMenuId === comment.id && (
                                      <>
                                        <div
                                          className="fixed inset-0 z-35 bg-transparent"
                                          onClick={() => setActiveCommentMenuId(null)}
                                        />
                                        <div className="absolute right-0 top-full mt-0.5 w-28 origin-top-right rounded-xl border border-slate-100 bg-white p-1 shadow-lg ring-1 ring-black/5 z-40 animate-in fade-in slide-in-from-top-1 duration-100">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveCommentMenuId(null);
                                              startEditComment(comment);
                                            }}
                                            className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 active:scale-98 transition-all cursor-pointer text-left"
                                          >
                                            <Pencil className="h-3 w-3 text-slate-400" />
                                            <span>Bearbeiten</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveCommentMenuId(null);
                                              setCommentDeleteConfirm({
                                                activityId: activity.id,
                                                commentId: comment.id,
                                              });
                                            }}
                                            className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-rose-650 hover:bg-rose-50 active:scale-98 transition-all cursor-pointer text-left"
                                          >
                                            <Trash2 className="h-3 w-3 text-rose-500" />
                                            <span>Löschen</span>
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                              {editingCommentId === comment.id ? (
                                <div className="mt-1 flex gap-2">
                                  <input
                                    value={editingCommentInput}
                                    onChange={(e) => setEditingCommentInput(e.target.value)}
                                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-brand-green-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateComment(activity.id, comment.id)}
                                    disabled={isCommentSaving || editingCommentInput.trim().length === 0}
                                    className="rounded-lg bg-brand-green-700 px-2 py-1 text-[9px] font-semibold text-white disabled:opacity-60 cursor-pointer"
                                  >
                                    {isCommentSaving ? "..." : "OK"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEditComment}
                                    className="rounded-lg border border-slate-200 px-2 py-1 text-[9px] font-semibold text-slate-500 cursor-pointer"
                                  >
                                    X
                                  </button>
                                </div>
                              ) : (
                                <p className="text-[11px] text-slate-600 leading-snug">
                                  {comment.content}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {userId ? (
                      <form onSubmit={handleAddComment} className="mt-3 flex gap-2">
                        <input
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          placeholder="Kommentar schreiben"
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] text-slate-700 outline-none focus:border-brand-green-500"
                        />
                        <button
                          type="submit"
                          disabled={isCommentSaving || commentInput.trim().length === 0}
                          className="rounded-lg bg-brand-green-700 px-3 py-2 text-[10px] font-semibold text-white transition-all disabled:opacity-60"
                        >
                          {isCommentSaving ? "..." : "Senden"}
                        </button>
                      </form>
                    ) : (
                      <div className="mt-3 text-[10px] text-slate-500">
                        Melde dich an, um zu kommentieren.
                      </div>
                    )}
                  </div>
                )}
              </ActivityCard>
            ))
          ) : (
            /* Empty State */
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-14 px-6 text-center shadow-sm">
              <Compass className="h-9 w-9 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 mt-3">
                Noch keine Aktivitäten
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 max-w-[240px] mx-auto leading-relaxed">
                Füge Freunde hinzu, um deren Empfehlungen und Aktivitäten hier zu sehen.
              </p>
              <Link
                href="/profile/friends"
                className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-brand-green-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-green-800 transition-all cursor-pointer"
              >
                <Users className="h-4 w-4" />
                Freunde finden
              </Link>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={commentDeleteConfirm !== null}
        title="Kommentar löschen?"
        message="Möchtest du diesen Kommentar wirklich löschen? Dieser Schritt kann nicht rückgängig gemacht werden."
        isLoading={
          commentDeleteConfirm !== null &&
          commentDeletingId === commentDeleteConfirm.commentId
        }
        onCancel={() => setCommentDeleteConfirm(null)}
        onConfirm={() => {
          if (!commentDeleteConfirm) return;
          const { activityId, commentId } = commentDeleteConfirm;
          setCommentDeleteConfirm(null);
          void handleDeleteComment(activityId, commentId);
        }}
      />
    </div>
  );
}

function formatCommentTimestamp(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return `vor ${Math.max(1, diffMins)} Min.`;
  }
  if (diffHours < 24) {
    return `vor ${diffHours} Std.`;
  }
  if (diffDays === 1) {
    return "gestern";
  }
  if (diffDays < 7) {
    return `vor ${diffDays} Tagen`;
  }

  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
