"use client";

import React, { useEffect, useState } from "react";
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
  Sparkles,
  Check,
  Plus,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { authenticatedFetch } from "@/lib/auth/authenticatedFetch";
import ActivityCard from "./ActivityCard";
import ConfirmDialog from "@/components/ConfirmDialog";

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

const CATEGORY_OPTIONS = [
  "Cafe",
  "Restaurant",
  "Freizeitpark",
  "Bar",
  "Museum",
  "Kino",
  "Park",
  "Natur",
  "Sehenswürdigkeit",
  "Date",
  "Freizeit",
  "Piss-Spot",
  "Bildung",
  "Einkaufen",
  "Sport",
  "Event",
];

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
  initialSaveCount,
  initialFriendship,
  isOwner,
  currentUserId,
}: {
  activity: Activity;
  creator: User;
  initialComments: Comment[];
  initialWishlisted: boolean;
  initialSaveCount: number;
  initialFriendship: Friendship | null;
  isOwner: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [activityData, setActivityData] = useState(activity);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editReview, setEditReview] = useState("");
  const [editIsMustSee, setEditIsMustSee] = useState(false);
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [editImageUrls, setEditImageUrls] = useState<string[]>([]);
  const [editNewFiles, setEditNewFiles] = useState<
    { id: string; file: File; previewUrl: string }[]
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [isWishlisted, setIsWishlisted] = useState(initialWishlisted);
  const [saveCount, setSaveCount] = useState(initialSaveCount);
  const [friendship, setFriendship] = useState<Friendship | null>(initialFriendship);
  
  // State for comments
  const [commentInput, setCommentInput] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isCommentSaving, setIsCommentSaving] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentInput, setEditingCommentInput] = useState("");
  const [activeCommentMenuId, setActiveCommentMenuId] = useState<string | null>(null);
  const [commentDeleteConfirmId, setCommentDeleteConfirmId] = useState<string | null>(null);
  const [isCommentDeleting, setIsCommentDeleting] = useState(false);

  const [isSubmittingFriendship, setIsSubmittingFriendship] = useState(false);

  const isFriend = isOwner || friendship?.status === "accepted";

  useEffect(() => {
    const handleOutsideClick = () => setIsMenuOpen(false);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen((prev) => !prev);
  };

  const startEdit = () => {
    setIsEditing(true);
    setEditName(activityData.placeName);
    setEditReview(activityData.description ?? "");
    setEditIsMustSee(Boolean(activityData.isMustSee));
    setEditCategories(activityData.categories ?? []);
    setEditImageUrls(activityData.imageUrls ?? []);
    setEditNewFiles([]);
    setActionError(null);
    setIsMenuOpen(false);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditName("");
    setEditReview("");
    setEditIsMustSee(false);
    setEditCategories([]);
    editNewFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setEditImageUrls([]);
    setEditNewFiles([]);
    setActionError(null);
  };

  const handleEditAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    let validFiles = Array.from(files).filter((file) => {
      if (!file.type.startsWith("image/")) {
        setActionError("Bitte nur Bilder hochladen.");
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        setActionError("Bilder dürfen maximal 5 MB groß sein.");
        return false;
      }
      return true;
    });

    const maxAllowed = 3;
    const remainingSlots = maxAllowed - editImageUrls.length;

    if (validFiles.length > remainingSlots) {
      setActionError(`Du kannst maximal ${maxAllowed} Bilder hochladen.`);
      validFiles = validFiles.slice(0, remainingSlots);
    }

    if (validFiles.length === 0) return;

    const newEntries = validFiles.map((file) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const previewUrl = URL.createObjectURL(file);
      return { id, file, previewUrl };
    });

    setEditNewFiles((prev) => [...prev, ...newEntries]);
    setEditImageUrls((prev) => [...prev, ...newEntries.map((entry) => entry.previewUrl)]);
  };

  const handleEditRemoveImage = (urlToRemove: string) => {
    setEditImageUrls((prev) => prev.filter((url) => url !== urlToRemove));

    const matchingNewFile = editNewFiles.find((f) => f.previewUrl === urlToRemove);
    if (matchingNewFile) {
      URL.revokeObjectURL(matchingNewFile.previewUrl);
      setEditNewFiles((prev) => prev.filter((f) => f.previewUrl !== urlToRemove));
    }
  };

  const toggleEditCategory = (category: string) => {
    setEditCategories((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    );
  };

  const saveEdit = async () => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setActionError("Name fehlt.");
      return;
    }

    setIsSaving(true);
    setActionError(null);
    try {
      const uploadedUrls: string[] = [];
      if (editNewFiles.length > 0) {
        for (const entry of editNewFiles) {
          const fileExt = entry.file.name.split(".").pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from("activity-images")
            .upload(fileName, entry.file);

          if (uploadError) {
            throw new Error(`Fehler beim Hochladen eines Bildes: ${uploadError.message}`);
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from("activity-images").getPublicUrl(fileName);
          uploadedUrls.push(publicUrl);
        }
      }

      const existingUrls = editImageUrls.filter((url) => !url.startsWith("blob:"));
      const finalImageUrls = [...existingUrls, ...uploadedUrls];

      const originalUrls = activityData.imageUrls || [];
      const deletedUrls = originalUrls.filter((url) => !finalImageUrls.includes(url));
      if (deletedUrls.length > 0) {
        const fileNames = deletedUrls.map((url) => {
          const parts = url.split("/");
          return parts[parts.length - 1];
        });
        supabase.storage
          .from("activity-images")
          .remove(fileNames)
          .catch((err) => console.error("Failed to delete removed images from storage", err));
      }

      const response = await authenticatedFetch(`/api/recommendations/${activityData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeName: trimmedName,
          description: editReview.trim() || null,
          isMustSee: editIsMustSee,
          categories: editCategories,
          imageUrls: finalImageUrls,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Speichern fehlgeschlagen.");
      }

      setActivityData((prev) => ({
        ...prev,
        placeName: trimmedName,
        description: editReview.trim(),
        isMustSee: editIsMustSee,
        categories: editCategories,
        imageUrls: finalImageUrls,
      }));

      editNewFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      cancelEdit();
      router.refresh();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Speichern fehlgeschlagen."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const deleteActivity = async () => {
    setIsDeleting(true);
    setActionError(null);
    try {
      const response = await authenticatedFetch(`/api/recommendations/${activityData.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Löschen fehlgeschlagen.");
      }
      setDeleteConfirmOpen(false);
      router.push("/profile");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Löschen fehlgeschlagen."
      );
      setDeleteConfirmOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

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
    setSaveCount((prev) => Math.max(0, prev + (nextState ? 1 : -1)));
    try {
      if (nextState) {
        const response = await authenticatedFetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activityId: activity.id }),
        });
        if (!response.ok) throw new Error();
      } else {
        const response = await authenticatedFetch(`/api/wishlist?activityId=${activity.id}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error();
      }
    } catch (err) {
      setIsWishlisted(!nextState);
      setSaveCount((prev) => Math.max(0, prev + (nextState ? -1 : 1)));
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
    setIsCommentDeleting(true);
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
    setIsCommentDeleting(false);
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
          {isFriend ? activityData.placeName : "Privater Ort"}
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
              id={activityData.id}
              placeName={activityData.placeName}
              latitude={activityData.latitude}
              longitude={activityData.longitude}
              isMustSee={activityData.isMustSee}
              description={activityData.description}
              categories={activityData.categories}
              timestamp={activityData.timestamp}
              imageUrls={activityData.imageUrls}
              friend={creator}
              isEditing={isEditing}
              editForm={
                <div className="space-y-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-brand-green-500"
                  />
                  <button
                    type="button"
                    onClick={() => setEditIsMustSee(!editIsMustSee)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all ${
                      editIsMustSee
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-white text-slate-500"
                    }`}
                  >
                    <Sparkles className="h-3 w-3" />
                    Must See
                  </button>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORY_OPTIONS.map((category) => {
                      const isSelected = editCategories.includes(category);
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => toggleEditCategory(category)}
                          className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? "border-brand-green-600 bg-brand-green-50 text-brand-green-800"
                              : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>
                  <textarea
                    value={editReview}
                    onChange={(e) => setEditReview(e.target.value)}
                    rows={3}
                    className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-brand-green-500"
                  />
                  <div className="mt-3 space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Bilder bearbeiten
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {editImageUrls.map((url, idx) => (
                        <div
                          key={idx}
                          className="relative h-16 w-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex-shrink-0"
                        >
                          <img src={url} alt="Empfehlungsbild" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleEditRemoveImage(url)}
                            className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/80 text-white hover:bg-slate-900 transition-all cursor-pointer shadow-md"
                            title="Bild löschen"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {editImageUrls.length < 3 && (
                        <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-350 bg-slate-50/50 hover:bg-slate-50 transition-all hover:border-brand-green-500 group">
                          <Plus className="h-4 w-4 text-slate-450 group-hover:text-brand-green-600 transition-colors" />
                          <span className="text-[8px] font-semibold text-slate-400 group-hover:text-brand-green-600 transition-colors mt-0.5">
                            Hinzufügen
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleEditAddImage}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  {actionError && (
                    <div className="rounded-lg border border-red-100 bg-red-50 px-2.5 py-2 text-[11px] text-red-700">
                      {actionError}
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveEdit()}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1 rounded-xl bg-brand-green-700 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-brand-green-700/10 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                    >
                      {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Speichern
                    </button>
                  </div>
                </div>
              }
              actions={
                isOwner && !isEditing ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={toggleMenu}
                      className="flex items-center justify-center p-1 text-slate-400 hover:text-slate-700 active:scale-95 transition-all cursor-pointer"
                      title="Optionen"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                    {isMenuOpen && (
                      <div className="absolute right-0 mt-1 w-32 origin-top-right rounded-xl border border-slate-100 bg-white p-1 shadow-lg ring-1 ring-black/5 z-30 animate-in fade-in slide-in-from-top-1 duration-100">
                        <button
                          type="button"
                          onClick={() => startEdit()}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 active:scale-98 transition-all cursor-pointer text-left"
                        >
                          <Pencil className="h-3 w-3 text-slate-400" />
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteConfirmOpen(true);
                            setIsMenuOpen(false);
                          }}
                          disabled={isDeleting}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-red-600 hover:bg-red-50 active:scale-98 transition-all cursor-pointer text-left disabled:opacity-60"
                        >
                          <Trash2 className="h-3 w-3 text-red-400" />
                          Löschen
                        </button>
                      </div>
                    )}
                  </div>
                ) : null
              }
              bottomLeftActions={
                <>
                  {/* Bookmark Button */}
                  <button
                    onClick={handleToggleWishlist}
                    className={`flex items-center gap-1.5 justify-center p-1 rounded-lg active:scale-90 transition-all cursor-pointer ${
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
                    {saveCount > 0 && (
                      <span className="text-[11px] font-semibold select-none">
                        {saveCount}
                      </span>
                    )}
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
                                            setCommentDeleteConfirmId(comment.id);
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

      <ConfirmDialog
        open={commentDeleteConfirmId !== null}
        title="Kommentar löschen?"
        message="Möchtest du diesen Kommentar wirklich löschen? Dieser Schritt kann nicht rückgängig gemacht werden."
        isLoading={isCommentDeleting}
        onCancel={() => setCommentDeleteConfirmId(null)}
        onConfirm={() => {
          if (!commentDeleteConfirmId) return;
          const id = commentDeleteConfirmId;
          setCommentDeleteConfirmId(null);
          void handleDeleteComment(id);
        }}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Empfehlung löschen?"
        message="Möchtest du diese Empfehlung wirklich unwiderruflich löschen?"
        isLoading={isDeleting}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={() => void deleteActivity()}
      />

      {actionError && !isEditing && (
        <div className="fixed bottom-24 left-4 right-4 z-20 mx-auto max-w-lg rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700 shadow-sm">
          {actionError}
        </div>
      )}
    </div>
  );
}
