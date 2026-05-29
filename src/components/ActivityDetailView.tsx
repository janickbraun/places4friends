"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  MessageCircle,
  Lock,
  Loader2,
  UserPlus,
  Clock,
  UserCheck,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ActivityCard from "./ActivityCard";

interface User {
  id: string;
  name: string;
  username: string;
  initials: string;
  color: string;
  avatarUrl: string | null;
}

interface Activity {
  id: string;
  userId: string;
  placeName: string;
  placeAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  isMustSee: boolean;
  description: string;
  categories: string[];
  imageUrls: string[];
  timestamp: string;
}

interface Comment {
  id: string;
  activityId: string;
  userId: string;
  userName: string;
  userInitials: string;
  userColor: string;
  userAvatarUrl: string | null;
  content: string;
  createdAt: string;
}

interface Friendship {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted";
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

function getUserColorClass(userId: string): string {
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
  for (let i = 0; i < userId.length; i++) {
    sum += userId.charCodeAt(i);
  }
  return colors[sum % colors.length];
}

export default function ActivityDetailView({
  activity,
  creator,
  initialComments,
  initialWishlisted,
  initialFriendship,
  isOwner,
  currentUserId,
}: {
  activity: Activity;
  creator: User;
  initialComments: Comment[];
  initialWishlisted: boolean;
  initialFriendship: Friendship | null;
  isOwner: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [isWishlisted, setIsWishlisted] = useState(initialWishlisted);
  const [friendship, setFriendship] = useState<Friendship | null>(initialFriendship);
  
  // State for comments
  const [commentInput, setCommentInput] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isCommentSaving, setIsCommentSaving] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentInput, setEditingCommentInput] = useState("");
  const [activeCommentMenuId, setActiveCommentMenuId] = useState<string | null>(null);
  
  const [isSubmittingFriendship, setIsSubmittingFriendship] = useState(false);

  const isFriend = isOwner || friendship?.status === "accepted";

  // Reload comments helper
  const reloadComments = async () => {
    setIsCommentsLoading(true);
    const { data, error } = await supabase
      .from("activity_comments")
      .select(
        "id, content, created_at, user_id, profiles:profiles!activity_comments_user_id_fkey(id, username, full_name, avatar_url)"
      )
      .eq("activity_id", activity.id)
      .order("created_at", { ascending: true });

    if (error) {
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
        const avatarUrl = profile?.avatar_url
          ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_url).data.publicUrl
          : null;

        return {
          id: row.id,
          activityId: activity.id,
          userId: row.user_id,
          userName: name,
          userInitials: initials,
          userColor: getUserColorClass(row.user_id),
          userAvatarUrl: avatarUrl,
          content: row.content,
          createdAt: row.created_at,
        } as Comment;
      });
      setComments(loaded);
      setCommentError(null);
    }
    setIsCommentsLoading(false);
  };

  // Toggle Wishlist
  const handleToggleWishlist = async () => {
    const nextState = !isWishlisted;
    setIsWishlisted(nextState);
    try {
      if (nextState) {
        const response = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activityId: activity.id }),
        });
        if (!response.ok) throw new Error();
      } else {
        const response = await fetch(`/api/wishlist?activityId=${activity.id}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error();
      }
    } catch (err) {
      // Revert state on error
      setIsWishlisted(!nextState);
    }
  };

  // Add comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = commentInput.trim();
    if (!content) return;

    setIsCommentSaving(true);
    setCommentError(null);

    const { error } = await supabase.from("activity_comments").insert({
      activity_id: activity.id,
      user_id: currentUserId,
      content,
    });

    if (error) {
      setCommentError("Kommentar konnte nicht gespeichert werden.");
    } else {
      setCommentInput("");
      await reloadComments();
    }
    setIsCommentSaving(false);
  };

  // Update comment
  const handleUpdateComment = async (commentId: string) => {
    const content = editingCommentInput.trim();
    if (!content) return;

    setIsCommentSaving(true);
    setCommentError(null);

    const { error } = await supabase
      .from("activity_comments")
      .update({ content })
      .eq("id", commentId);

    if (error) {
      setCommentError("Kommentar konnte nicht gespeichert werden.");
    } else {
      setEditingCommentId(null);
      setEditingCommentInput("");
      await reloadComments();
    }
    setIsCommentSaving(false);
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Kommentar wirklich löschen?")) return;

    setCommentError(null);
    const { error } = await supabase
      .from("activity_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      setCommentError("Kommentar konnte nicht gelöscht werden.");
    } else {
      await reloadComments();
    }
  };



  // Friendship Actions for private page
  const sendFriendRequest = async () => {
    setIsSubmittingFriendship(true);
    try {
      const { data, error } = await supabase
        .from("friendships")
        .insert({
          sender_id: currentUserId,
          receiver_id: creator.id,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      setFriendship(data);
    } catch (err) {
      console.error("Error sending friend request:", err);
    } finally {
      setIsSubmittingFriendship(false);
    }
  };

  const acceptFriendRequest = async () => {
    if (!friendship) return;
    setIsSubmittingFriendship(true);
    try {
      const { data, error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", friendship.id)
        .select()
        .single();

      if (error) throw error;
      setFriendship(data);
      // Instantly refresh the window/component logic
      router.refresh();
    } catch (err) {
      console.error("Error accepting friend request:", err);
    } finally {
      setIsSubmittingFriendship(false);
    }
  };

  const cancelFriendshipRequest = async () => {
    if (!friendship) return;
    setIsSubmittingFriendship(true);
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendship.id);

      if (error) throw error;
      setFriendship(null);
    } catch (err) {
      console.error("Error removing friendship:", err);
    } finally {
      setIsSubmittingFriendship(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20 font-sans relative">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-100 bg-white px-4">
        <button
          onClick={() => {
            // Check if there is history, otherwise fallback
            if (window.history.length > 1) {
              router.back();
            } else {
              router.push("/activities");
            }
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
          aria-label="Zurück"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-bold text-slate-900 truncate max-w-[200px]">
          {isFriend ? activity.placeName : "Privater Ort"}
        </h1>
        <div className="w-8" />
      </header>



      {/* Main Content Area */}
      <div className="flex-grow overflow-y-auto px-4 pt-6 page-transition max-w-lg mx-auto w-full">
        {!isFriend ? (
          /* Private Post UI */
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 shadow-sm mb-6 animate-pulse">
              <Lock className="h-9 w-9" />
            </div>

            <h2 className="text-lg font-bold text-slate-900">Beitrag ist privat</h2>
            <p className="mt-2 text-xs text-slate-500 max-w-[260px] leading-relaxed">
              Verbinde dich mit {creator.name}, um diese Empfehlung und Details auf der Karte zu sehen.
            </p>

            <div className="mt-8 w-full max-w-[240px]">
              {isSubmittingFriendship ? (
                <button
                  disabled
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 py-3 text-xs font-bold text-slate-400 border border-slate-200/50"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verarbeiten...</span>
                </button>
              ) : !friendship ? (
                <button
                  onClick={sendFriendRequest}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green-700 py-3 text-xs font-bold text-white shadow-sm hover:bg-brand-green-800 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Freund hinzufügen</span>
                </button>
              ) : friendship.status === "pending" && friendship.sender_id === currentUserId ? (
                <button
                  onClick={cancelFriendshipRequest}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-150 py-3 text-xs font-bold text-slate-600 border border-slate-200 hover:bg-red-50 hover:text-red-600 transition-all active:scale-[0.98] cursor-pointer"
                  title="Anfrage zurückziehen"
                >
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>Anfrage ausstehend</span>
                </button>
              ) : (
                <button
                  onClick={acceptFriendRequest}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green-700 py-3 text-xs font-bold text-white shadow-sm hover:bg-brand-green-800 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>Anfrage annehmen</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Public/Owner View using ActivityCard for exact design replication */
          <div className="pb-12">
            <ActivityCard
              id={activity.id}
              placeName={activity.placeName}
              latitude={activity.latitude}
              longitude={activity.longitude}
              isMustSee={activity.isMustSee}
              description={activity.description}
              categories={activity.categories}
              timestamp={activity.timestamp}
              imageUrls={activity.imageUrls}
              friend={creator}
              bottomLeftActions={
                <>
                  {/* Bookmark Button */}
                  <button
                    onClick={handleToggleWishlist}
                    className={`flex items-center justify-center p-1 rounded-lg active:scale-90 transition-all cursor-pointer ${
                      isWishlisted
                        ? "text-brand-green-700"
                        : "text-slate-500 hover:text-brand-green-800"
                    }`}
                    title={isWishlisted ? "Aus Wishlist entfernen" : "In Wishlist speichern"}
                  >
                    <Bookmark
                      className="h-5 w-5 transition-colors"
                      fill={isWishlisted ? "currentColor" : "none"}
                    />
                  </button>

                  {/* Comment Icon Indicator */}
                  <div className="flex items-center gap-1.5 justify-center text-slate-500 p-1">
                    <MessageCircle className="h-4.5 w-4.5" />
                    {comments.length > 0 && (
                      <span className="text-[11px] font-semibold select-none">
                        {comments.length}
                      </span>
                    )}
                  </div>
                </>
              }
            >
              {/* Comments Thread Section */}
              <div className="border-t border-slate-100 pt-4 mt-4 space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-450">
                  <span className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-400">
                    Kommentare ({comments.length})
                  </span>
                </div>

                {commentError && (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[10px] text-red-700">
                    {commentError}
                  </div>
                )}

                {isCommentsLoading ? (
                  <div className="flex items-center justify-center py-4 text-slate-400 text-[11px] gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-green-700" />
                    <span>Kommentare werden geladen...</span>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-4 text-slate-400 text-[10px] font-medium">
                    Noch keine Kommentare. Schreibe den ersten!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-2.5 items-start">
                        <Link
                          href={comment.userId === currentUserId ? "/profile" : `/profile/${comment.userId}`}
                          className="flex-shrink-0 hover:opacity-85 transition-opacity"
                        >
                          <div
                            className={`flex h-6 w-6 items-center justify-center overflow-hidden rounded-full font-bold text-[8px] text-white shadow-sm flex-shrink-0 ${comment.userColor}`}
                          >
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

                        <div className="flex-grow min-w-0 bg-slate-50/50 rounded-2xl px-3 py-2 border border-slate-100">
                          <div className="flex items-center justify-between gap-2">
                            <Link
                              href={comment.userId === currentUserId ? "/profile" : `/profile/${comment.userId}`}
                              className="hover:text-brand-green-700 hover:underline cursor-pointer"
                            >
                              <span className="text-[10px] font-bold text-slate-800">
                                {comment.userName}
                              </span>
                            </Link>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-[8px] text-slate-400 font-medium">
                                {formatCommentTimestamp(comment.createdAt)}
                              </span>

                              {/* Comment Options Dropdown */}
                              {currentUserId === comment.userId && editingCommentId !== comment.id && (
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveCommentMenuId(
                                        activeCommentMenuId === comment.id ? null : comment.id
                                      )
                                    }
                                    className="flex h-4.5 w-4.5 items-center justify-center rounded text-slate-400 hover:bg-slate-200/50 hover:text-slate-600 transition-all cursor-pointer"
                                    title="Optionen"
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </button>

                                  {activeCommentMenuId === comment.id && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-30 bg-transparent"
                                        onClick={() => setActiveCommentMenuId(null)}
                                      />
                                      <div className="absolute right-0 top-full mt-0.5 w-24 origin-top-right rounded-lg border border-slate-100 bg-white p-0.5 shadow-lg ring-1 ring-black/5 z-40 animate-in fade-in slide-in-from-top-1 duration-100">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveCommentMenuId(null);
                                            setEditingCommentId(comment.id);
                                            setEditingCommentInput(comment.content);
                                          }}
                                          className="flex w-full items-center gap-1 rounded px-2 py-1 text-[9px] font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer text-left"
                                        >
                                          <Pencil className="h-3 w-3 text-slate-400" />
                                          <span>Bearbeiten</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveCommentMenuId(null);
                                            handleDeleteComment(comment.id);
                                          }}
                                          className="flex w-full items-center gap-1 rounded px-2 py-1 text-[9px] font-semibold text-rose-600 hover:bg-rose-50 transition-all cursor-pointer text-left"
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
                          </div>

                          {editingCommentId === comment.id ? (
                            <div className="mt-1.5 flex gap-2">
                              <input
                                value={editingCommentInput}
                                onChange={(e) => setEditingCommentInput(e.target.value)}
                                className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-700 outline-none focus:border-brand-green-500"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateComment(comment.id)}
                                disabled={isCommentSaving || !editingCommentInput.trim()}
                                className="rounded-lg bg-brand-green-700 px-2 py-1 text-[9px] font-bold text-white disabled:opacity-60 cursor-pointer"
                              >
                                OK
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditingCommentInput("");
                                }}
                                className="rounded-lg border border-slate-200 px-2 py-1 text-[9px] font-bold text-slate-500 cursor-pointer"
                              >
                                Abbrechen
                              </button>
                            </div>
                          ) : (
                            <p className="text-[10.5px] text-slate-650 leading-relaxed mt-0.5 break-words">
                              {comment.content}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Comment Input Form */}
                <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                  <input
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Kommentar schreiben..."
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700 outline-none focus:border-brand-green-500"
                  />
                  <button
                    type="submit"
                    disabled={isCommentSaving || !commentInput.trim()}
                    className="rounded-xl bg-brand-green-700 px-4 py-2 text-[10px] font-bold text-white transition-all hover:bg-brand-green-800 disabled:opacity-60 flex items-center justify-center cursor-pointer"
                  >
                    {isCommentSaving ? "..." : "Senden"}
                  </button>
                </form>
              </div>
            </ActivityCard>
          </div>
        )}
      </div>
    </div>
  );
}
