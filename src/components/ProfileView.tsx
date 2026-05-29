"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Settings, Sparkles, LogOut, MapPin, Pencil, Trash2, X, Check, Bookmark, Loader2, Menu, Shield, FileText, MoreVertical, MessageCircle } from "lucide-react";
import { signout } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/client";
import ActivityCard from "./ActivityCard";

interface User {
  id: string;
  email: string;
  name?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
}

interface PlaceItem {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  isMustSee?: boolean;
  review: string;
  timestamp: string;
  categories?: string[];
  imageUrls?: string[];
}

interface WishlistItem {
  id: string;
  activityId: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  isMustSee?: boolean;
  review: string;
  timestamp: string;
  categories?: string[];
  imageUrls?: string[];
  friend: {
    id: string;
    name: string;
    username: string;
    initials: string;
    color: string;
    avatarUrl?: string | null;
  };
}

interface ActivityComment {
  id: string;
  activityId: string;
  userId: string;
  userName: string;
  userInitials: string;
  userColor: string;
  content: string;
  createdAt: string;
  userAvatarUrl?: string | null;
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
  "Sehenswuerdigkeit",
];

export default function ProfileView({ 
  user, 
  friendsCount = 0,
  places = [],
  wishlist = []
}: { 
  user?: User; 
  friendsCount?: number;
  places?: PlaceItem[];
  wishlist?: WishlistItem[];
}) {
  const supabase = createClient();

  const [items, setItems] = useState<PlaceItem[]>(places);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>(wishlist);
  const [activeTab, setActiveTab] = useState<"recommendations" | "wishlist">("recommendations");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [avatarPath, setAvatarPath] = useState<string | null>(user?.avatarUrl ?? null);
  const [avatarPublicUrl, setAvatarPublicUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropScale, setCropScale] = useState(1);
  const [cropCenter, setCropCenter] = useState<{ x: number; y: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editReview, setEditReview] = useState("");
  const [editIsMustSee, setEditIsMustSee] = useState(false);
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [commentsByPlace, setCommentsByPlace] = useState<Record<string, ActivityComment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentErrors, setCommentErrors] = useState<Record<string, string | null>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [savingCommentId, setSavingCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentInput, setEditingCommentInput] = useState("");
  const [commentDeletingId, setCommentDeletingId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const isDraggingRef = useRef(false);
  const lastDragPosRef = useRef<{ x: number; y: number } | null>(null);

  const cropPreviewSize = 220;
  const cropExportSize = 512;
  const cropScaleLimits = useMemo(() => ({ min: 1, max: 3 }), []);

  useEffect(() => {
    setItems(places);
  }, [places]);

  useEffect(() => {
    setWishlistItems(wishlist);
  }, [wishlist]);

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuId(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => {
      window.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    setAvatarPath(user?.avatarUrl ?? null);
  }, [user?.avatarUrl]);

  useEffect(() => {
    if (!avatarPath) {
      setAvatarPublicUrl(null);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(avatarPath);
    setAvatarPublicUrl(`${data.publicUrl}?t=${Date.now()}`);
  }, [avatarPath]);

  useEffect(() => {
    if (!cropImageSrc) {
      cropImageRef.current = null;
      setCropCenter(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      cropImageRef.current = img;
      setCropCenter({ x: img.naturalWidth / 2, y: img.naturalHeight / 2 });
      setCropScale(1);
    };
    img.src = cropImageSrc;
  }, [cropImageSrc]);

  useEffect(() => {
    if (!isCropOpen || !cropImageRef.current || !cropCenter) return;
    drawCropPreview();
  }, [cropCenter, cropScale, isCropOpen]);

  const handleRemoveFromWishlist = async (activityId: string) => {
    setWishlistItems((prev) => prev.filter((item) => item.activityId !== activityId));
    try {
      const response = await fetch(`/api/wishlist?activityId=${activityId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error();
    } catch (err) {
      const itemToRestore = wishlist.find((i) => i.activityId === activityId);
      if (itemToRestore) {
        setWishlistItems((prev) => [...prev, itemToRestore].sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
      }
    }
  };

  const triggerAvatarPicker = () => {
    avatarInputRef.current?.click();
  };

  const resetCropState = () => {
    setIsCropOpen(false);
    setCropImageSrc(null);
    setCropCenter(null);
    setCropScale(1);
  };

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  const getCropSettings = () => {
    const img = cropImageRef.current;
    if (!img || !cropCenter) return null;
    const baseSize = Math.min(img.naturalWidth, img.naturalHeight);
    const size = baseSize / cropScale;
    const half = size / 2;
    const centerX = clamp(cropCenter.x, half, img.naturalWidth - half);
    const centerY = clamp(cropCenter.y, half, img.naturalHeight - half);
    return { img, size, half, centerX, centerY };
  };

  const drawCropPreview = () => {
    const canvas = cropCanvasRef.current;
    const settings = getCropSettings();
    if (!canvas || !settings) return;

    const { img, size, centerX, centerY } = settings;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = cropPreviewSize;
    canvas.height = cropPreviewSize;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const sx = centerX - size / 2;
    const sy = centerY - size / 2;
    ctx.drawImage(img, sx, sy, size, size, 0, 0, canvas.width, canvas.height);
  };

  const exportCroppedBlob = async () => {
    const settings = getCropSettings();
    if (!settings) return null;
    const { img, size, centerX, centerY } = settings;

    const canvas = document.createElement("canvas");
    canvas.width = cropExportSize;
    canvas.height = cropExportSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const sx = centerX - size / 2;
    const sy = centerY - size / 2;
    ctx.drawImage(img, sx, sy, size, size, 0, 0, canvas.width, canvas.height);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
    });
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarError(null);
    if (!user) {
      setAvatarError("Profil nicht geladen.");
      return;
    }

    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Bitte waehle eine Bilddatei.");
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setAvatarError("Bild ist zu gross (max. 5 MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) {
        setAvatarError("Bild konnte nicht geladen werden.");
        return;
      }
      setCropImageSrc(result);
      setIsCropOpen(true);
    };
    reader.onerror = () => setAvatarError("Bild konnte nicht geladen werden.");
    reader.readAsDataURL(file);
  };

  const handleCropCancel = () => {
    resetCropState();
  };

  const handleCropConfirm = async () => {
    if (!user) {
      setAvatarError("Profil nicht geladen.");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const blob = await exportCroppedBlob();
      if (!blob) {
        throw new Error("CROP_FAILED");
      }

      const filePath = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, blob, {
          upsert: true,
          cacheControl: "3600",
          contentType: "image/jpeg",
        });

      if (uploadError) {
        throw uploadError;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: filePath })
        .eq("id", user.id);

      if (profileError) {
        throw profileError;
      }

      setAvatarPath(filePath);
      resetCropState();
    } catch (error) {
      setAvatarError("Profilbild konnte nicht gespeichert werden.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCropPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastDragPosRef.current = { x: event.clientX, y: event.clientY };
  };

  const handleCropPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !cropCenter) return;
    const last = lastDragPosRef.current;
    if (!last) return;
    const settings = getCropSettings();
    if (!settings) return;

    const dx = event.clientX - last.x;
    const dy = event.clientY - last.y;
    lastDragPosRef.current = { x: event.clientX, y: event.clientY };

    const delta = settings.size / cropPreviewSize;
    const next = {
      x: cropCenter.x - dx * delta,
      y: cropCenter.y - dy * delta,
    };
    setCropCenter(next);
  };

  const handleCropPointerUp = () => {
    isDraggingRef.current = false;
    lastDragPosRef.current = null;
  };

  useEffect(() => {
    if (!user || items.length === 0) {
      setCommentsByPlace({});
      return;
    }

    const activityIds = items.map((item) => item.id);
    let isActive = true;

    const loadComments = async () => {
      const { data, error } = await supabase
        .from("activity_comments")
        .select(
          "id, activity_id, user_id, content, created_at, profiles:profiles!activity_comments_user_id_fkey(id, username, full_name, avatar_url)"
        )
        .in("activity_id", activityIds)
        .order("created_at", { ascending: true });

      if (!isActive) return;

      if (error) {
        setCommentsByPlace({});
        return;
      }

      const grouped: Record<string, ActivityComment[]> = {};
      (data || []).forEach((row: any) => {
        const profile = row.profiles;
        const name = profile?.full_name ?? profile?.username ?? "Nutzer";
        const initials = name
          .split(" ")
          .map((n: string) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase() || "?";

        let avatarUrl: string | null = null;
        if (profile?.avatar_url) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(profile.avatar_url);
          avatarUrl = urlData?.publicUrl ?? null;
        }

        const comment: ActivityComment = {
          id: row.id,
          activityId: row.activity_id,
          userId: row.user_id,
          userName: name,
          userInitials: initials,
          userColor: getUserColorClass(row.user_id),
          content: row.content,
          createdAt: row.created_at,
          userAvatarUrl: avatarUrl,
        };

        if (!grouped[comment.activityId]) {
          grouped[comment.activityId] = [];
        }
        grouped[comment.activityId].push(comment);
      });

      setCommentsByPlace(grouped);
    };

    loadComments().catch(() => {
      if (!isActive) return;
      setCommentsByPlace({});
    });

    return () => {
      isActive = false;
    };
  }, [items, user?.id]);

  const startEdit = (place: PlaceItem) => {
    setEditingId(place.id);
    setEditName(place.name);
    setEditReview(place.review ?? "");
    setEditIsMustSee(Boolean(place.isMustSee));
    setEditCategories(place.categories ?? []);
    setActionError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditReview("");
    setEditIsMustSee(false);
    setEditCategories([]);
    setActionError(null);
  };

  const toggleEditCategory = (category: string) => {
    setEditCategories((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    );
  };

  const saveEdit = async (placeId: string) => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setActionError("Name fehlt.");
      return;
    }
    setIsSaving(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/recommendations/${placeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeName: trimmedName,
          description: editReview.trim() || null,
          isSuperLike: editIsMustSee,
          categories: editCategories,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Speichern fehlgeschlagen.");
      }
      setItems((prev) =>
        prev.map((item) =>
          item.id === placeId
            ? {
                ...item,
                name: trimmedName,
                review: editReview.trim(),
                isMustSee: editIsMustSee,
                categories: editCategories,
              }
            : item
        )
      );
      cancelEdit();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Speichern fehlgeschlagen."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const deletePlace = async (placeId: string) => {
    setDeletingId(placeId);
    setActionError(null);
    try {
      const response = await fetch(`/api/recommendations/${placeId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Loeschen fehlgeschlagen.");
      }
      setItems((prev) => prev.filter((item) => item.id !== placeId));
      if (editingId === placeId) {
        cancelEdit();
      }
      setDeleteConfirmId(null);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Loeschen fehlgeschlagen."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const toggleMenu = (placeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId((prev) => (prev === placeId ? null : placeId));
  };

  const toggleComments = (placeId: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [placeId]: !prev[placeId],
    }));
  };

  const updateCommentInput = (placeId: string, value: string) => {
    setCommentInputs((prev) => ({ ...prev, [placeId]: value }));
  };

  const startEditComment = (comment: ActivityComment) => {
    setEditingCommentId(comment.id);
    setEditingCommentInput(comment.content);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentInput("");
  };

  const reloadCommentsForPlace = async (placeId: string) => {
    setLoadingComments((prev) => ({ ...prev, [placeId]: true }));
    const { data, error } = await supabase
      .from("activity_comments")
      .select(
        "id, activity_id, user_id, content, created_at, profiles:profiles!activity_comments_user_id_fkey(id, username, full_name)"
      )
      .eq("activity_id", placeId)
      .order("created_at", { ascending: true });

    if (error) {
      setCommentErrors((prev) => ({ ...prev, [placeId]: "Kommentare konnten nicht geladen werden." }));
      setLoadingComments((prev) => ({ ...prev, [placeId]: false }));
      return;
    }

    const loaded = (data || []).map((row: any) => {
      const profile = row.profiles;
      const name = profile?.full_name ?? profile?.username ?? "Nutzer";
      const initials = name
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "?";

      return {
        id: row.id,
        activityId: row.activity_id,
        userId: row.user_id,
        userName: name,
        userInitials: initials,
        userColor: getUserColorClass(row.user_id),
        content: row.content,
        createdAt: row.created_at,
      } as ActivityComment;
    });

    setCommentsByPlace((prev) => ({ ...prev, [placeId]: loaded }));
    setCommentErrors((prev) => ({ ...prev, [placeId]: null }));
    setLoadingComments((prev) => ({ ...prev, [placeId]: false }));
  };

  const handleAddComment = async (placeId: string) => {
    if (!user) return;
    const content = (commentInputs[placeId] || "").trim();
    if (!content) {
      setCommentErrors((prev) => ({ ...prev, [placeId]: "Kommentar fehlt." }));
      return;
    }

    setSavingCommentId(placeId);
    setCommentErrors((prev) => ({ ...prev, [placeId]: null }));

    const { error } = await supabase.from("activity_comments").insert({
      activity_id: placeId,
      user_id: user.id,
      content,
    });

    if (error) {
      setCommentErrors((prev) => ({ ...prev, [placeId]: "Kommentar konnte nicht gespeichert werden." }));
    } else {
      setCommentInputs((prev) => ({ ...prev, [placeId]: "" }));
      await reloadCommentsForPlace(placeId);
    }

    setSavingCommentId(null);
  };

  const handleUpdateComment = async (placeId: string, commentId: string) => {
    const content = editingCommentInput.trim();
    if (!content) {
      setCommentErrors((prev) => ({ ...prev, [placeId]: "Kommentar fehlt." }));
      return;
    }

    setSavingCommentId(placeId);
    setCommentErrors((prev) => ({ ...prev, [placeId]: null }));

    const { error } = await supabase
      .from("activity_comments")
      .update({ content })
      .eq("id", commentId);

    if (error) {
      setCommentErrors((prev) => ({ ...prev, [placeId]: "Kommentar konnte nicht gespeichert werden." }));
    } else {
      cancelEditComment();
      await reloadCommentsForPlace(placeId);
    }

    setSavingCommentId(null);
  };

  const handleDeleteComment = async (placeId: string, commentId: string) => {
    if (!globalThis.confirm("Kommentar wirklich loeschen?")) return;

    setCommentDeletingId(commentId);
    setCommentErrors((prev) => ({ ...prev, [placeId]: null }));

    const { error } = await supabase
      .from("activity_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      setCommentErrors((prev) => ({ ...prev, [placeId]: "Kommentar konnte nicht geloescht werden." }));
    } else {
      await reloadCommentsForPlace(placeId);
    }

    setCommentDeletingId(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-100 bg-white px-4">
        <h1 className="text-lg font-bold text-slate-900">Mein Profil</h1>
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
            aria-label="Menü öffnen"
          >
            <Menu className="h-5 w-5" />
          </button>

          {isMenuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40 bg-transparent"
                onClick={() => setIsMenuOpen(false)}
              />
              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-slate-100 bg-white p-2 shadow-xl ring-1 ring-black/5 focus:outline-none z-50 animate-in fade-in slide-in-from-top-2 duration-100">
                <Link
                  href="/profile/settings"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-98 transition-all cursor-pointer"
                >
                  <Settings className="h-4.5 w-4.5 text-slate-400" />
                  <span>Einstellungen</span>
                </Link>

                <Link
                  href="/datenschutz"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-98 transition-all cursor-pointer"
                >
                  <Shield className="h-4.5 w-4.5 text-slate-400" />
                  <span>Datenschutzerklärung</span>
                </Link>

                <Link
                  href="/impressum"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-98 transition-all cursor-pointer"
                >
                  <FileText className="h-4.5 w-4.5 text-slate-400" />
                  <span>Impressum</span>
                </Link>

                <div className="my-1 border-t border-slate-100" />

                <form action={signout} onSubmit={() => setIsMenuOpen(false)}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 active:scale-98 transition-all cursor-pointer text-left"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                    <span>Abmelden</span>
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="flex-grow overflow-y-auto px-4 pt-6 page-transition">
        {/* Profile Card Info */}
        <div className="flex flex-col items-center text-center">
          {/* Avatar Placeholder */}
          <div className="relative">
            {avatarPublicUrl ? (
              <div className="flex h-22 w-22 items-center justify-center rounded-full bg-slate-100 shadow-md">
                <img
                  src={avatarPublicUrl}
                  alt="Profilbild"
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-22 w-22 items-center justify-center rounded-full bg-gradient-to-tr from-brand-green-800 to-brand-green-500 text-white font-bold text-2xl shadow-md">
                {user?.name
                  ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("")
                  : user?.username
                  ? user.username.slice(0, 2).toUpperCase()
                  : ""}
              </div>
            )}
            <button
              type="button"
              onClick={triggerAvatarPicker}
              disabled={isUploadingAvatar}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-white bg-slate-900 text-white shadow-md transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              aria-label="Profilbild aendern"
              title="Profilbild aendern"
            >
              {isUploadingAvatar ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Pencil className="h-3.5 w-3.5" />
              )}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {avatarError && (
            <p className="mt-2 text-[11px] font-semibold text-rose-600">
              {avatarError}
            </p>
          )}

          <h2 className="mt-4 text-lg font-bold text-slate-950">{user?.name ?? user?.email ?? 'Profil'}</h2>
          <p className="text-xs font-semibold text-brand-green-700 mt-0.5">{user?.username ? `@${user.username}` : ''}</p>
          <Link
            href="/profile/friends"
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-brand-green-800 transition-colors cursor-pointer"
          >
            <span>
              {friendsCount} {friendsCount === 1 ? "Freund" : "Freunde"}
            </span>
          </Link>
        </div>

        {/* Tabs */}
        <div className="mt-8 flex w-full border-b border-slate-100">
          <button
            onClick={() => setActiveTab("recommendations")}
            className={`flex-1 pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === "recommendations"
                ? "border-brand-green-700 text-brand-green-800"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Meine Empfehlungen
          </button>
          <button
            onClick={() => setActiveTab("wishlist")}
            className={`flex-1 pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === "wishlist"
                ? "border-brand-green-700 text-brand-green-800"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Wishlist
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === "recommendations" ? (
            <div className="space-y-4">
              {actionError && editingId === null && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {actionError}
                </div>
              )}

              {/* Places List */}
              <div className="space-y-3.5 pb-8">
                {items.length > 0 ? (
                  items.map((place) => (
                    <ActivityCard
                      key={place.id}
                      id={place.id}
                      placeName={place.name}
                      latitude={place.latitude}
                      longitude={place.longitude}
                      isMustSee={place.isMustSee}
                      description={place.review}
                      categories={place.categories}
                      timestamp={place.timestamp}
                      imageUrls={place.imageUrls}
                      isEditing={editingId === place.id}
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
                              onClick={() => saveEdit(place.id)}
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
                        editingId === place.id ? null : (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => toggleMenu(place.id, e)}
                              className="flex items-center justify-center p-1 text-slate-400 hover:text-slate-700 active:scale-95 transition-all cursor-pointer"
                              title="Optionen"
                            >
                              <MoreVertical className="h-5 w-5" />
                            </button>
                            {activeMenuId === place.id && (
                              <div className="absolute right-0 mt-1 w-32 origin-top-right rounded-xl border border-slate-100 bg-white p-1 shadow-lg ring-1 ring-black/5 z-30 animate-in fade-in slide-in-from-top-1 duration-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    startEdit(place);
                                    setActiveMenuId(null);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 active:scale-98 transition-all cursor-pointer text-left"
                                >
                                  <Pencil className="h-3 w-3 text-slate-400" />
                                  Bearbeiten
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteConfirmId(place.id);
                                    setActiveMenuId(null);
                                  }}
                                  disabled={deletingId === place.id}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-red-600 hover:bg-red-50 active:scale-98 transition-all cursor-pointer text-left disabled:opacity-60"
                                >
                                  <Trash2 className="h-3 w-3 text-red-400" />
                                  Löschen
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      }
                    >
                      {editingId === place.id && actionError && (
                        <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-2.5 py-2 text-[11px] text-red-700">
                          {actionError}
                        </div>
                      )}

                      {editingId !== place.id && (
                        <div className="pl-5 pt-3 flex items-center">
                          <button
                            type="button"
                            onClick={() => toggleComments(place.id)}
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-brand-green-800 transition-colors cursor-pointer"
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span>
                              {commentsByPlace[place.id]?.length ?? 0} {commentsByPlace[place.id]?.length === 1 ? "Kommentar" : "Kommentare"}
                            </span>
                          </button>
                        </div>
                      )}

                      {expandedComments[place.id] && (
                        <div className="mt-4 border-t border-slate-100 pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span className="font-semibold uppercase tracking-wide">Kommentare</span>
                            <span>{commentsByPlace[place.id]?.length ?? 0}</span>
                          </div>

                          {commentErrors[place.id] && (
                            <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-[10px] text-red-700">
                              {commentErrors[place.id]}
                            </div>
                          )}

                          {loadingComments[place.id] ? (
                            <div className="mt-2 text-[10px] text-slate-500">
                              Kommentare werden geladen...
                            </div>
                          ) : (commentsByPlace[place.id] ?? []).length === 0 ? (
                            <div className="mt-2 text-[10px] text-slate-500">
                              Noch keine Kommentare.
                            </div>
                          ) : (
                            <div className="mt-2 space-y-2">
                              {(commentsByPlace[place.id] ?? []).map((comment) => (
                                <div key={comment.id} className="flex gap-2">
                                  {comment.userAvatarUrl ? (
                                    <img
                                      src={comment.userAvatarUrl}
                                      alt={comment.userName}
                                      className="h-5 w-5 rounded-full object-cover flex-shrink-0"
                                    />
                                  ) : (
                                    <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold text-white flex-shrink-0 ${comment.userColor}`}>
                                      {comment.userInitials}
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-semibold text-slate-700">
                                        {comment.userName}
                                      </span>
                                      <span className="text-[9px] text-slate-400">
                                        {formatCommentTimestamp(comment.createdAt)}
                                      </span>
                                      {user?.id === comment.userId && editingCommentId !== comment.id && (
                                        <div className="ml-auto flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => startEditComment(comment)}
                                            className="text-[9px] font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                                          >
                                            Bearbeiten
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteComment(place.id, comment.id)}
                                            disabled={commentDeletingId === comment.id}
                                            className="text-[9px] font-semibold text-red-500 hover:text-red-600 disabled:opacity-60 cursor-pointer"
                                          >
                                            Loeschen
                                          </button>
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
                                          onClick={() => handleUpdateComment(place.id, comment.id)}
                                          disabled={savingCommentId === place.id || editingCommentInput.trim().length === 0}
                                          className="rounded-lg bg-brand-green-700 px-2 py-1 text-[9px] font-semibold text-white disabled:opacity-60 cursor-pointer"
                                        >
                                          {savingCommentId === place.id ? "..." : "OK"}
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

                          <div className="mt-3 flex gap-2">
                            <input
                              value={commentInputs[place.id] ?? ""}
                              onChange={(e) => updateCommentInput(place.id, e.target.value)}
                              placeholder="Kommentar schreiben"
                              className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-700 outline-none focus:border-brand-green-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddComment(place.id)}
                              disabled={savingCommentId === place.id || !(commentInputs[place.id] || "").trim()}
                              className="rounded-lg bg-brand-green-700 px-3 py-1.5 text-[10px] font-semibold text-white transition-all disabled:opacity-60 cursor-pointer"
                            >
                              {savingCommentId === place.id ? "..." : "Senden"}
                            </button>
                          </div>
                        </div>
                      )}
                    </ActivityCard>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
                    <MapPin className="h-8 w-8 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-500 mt-2 font-medium">Noch keine Empfehlungen eingetragen</p>
                    <Link
                      href="/create"
                      className="mt-3.5 inline-flex items-center gap-1 rounded-xl bg-brand-green-700 px-3.5 py-2 text-[11px] font-bold text-white shadow-sm hover:bg-brand-green-800 transition-all cursor-pointer"
                    >
                      Ort empfehlen
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Wishlist Tab Content */
            <div className="space-y-3.5 pb-8">
              {wishlistItems.length > 0 ? (
                wishlistItems.map((item) => (
                  <ActivityCard
                    key={item.id}
                    id={item.activityId}
                    placeName={item.name}
                    latitude={item.latitude}
                    longitude={item.longitude}
                    isMustSee={item.isMustSee}
                    description={item.review}
                    categories={item.categories}
                    timestamp={item.timestamp}
                    friend={item.friend}
                    imageUrls={item.imageUrls}
                    actions={
                      <button
                        onClick={() => handleRemoveFromWishlist(item.activityId)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-100 bg-white hover:bg-slate-50 active:scale-90 transition-all cursor-pointer shadow-sm text-brand-green-700"
                        title="Aus Wishlist entfernen"
                      >
                        <Bookmark className="h-3.5 w-3.5 fill-brand-green-700 text-brand-green-700" />
                      </button>
                    }
                  />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
                  <Bookmark className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 mt-2 font-medium">Deine Wishlist ist noch leer</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                    Speichere die Lieblingsorte deiner Freunde über die Karte oder den Feed.
                  </p>
                </div>
              )}
            </div>
          )}
      </div>

      {isCropOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Profilbild zuschneiden</h3>
              <button
                type="button"
                onClick={handleCropCancel}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                aria-label="Crop schliessen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-[11px] font-medium text-slate-500">
              Ziehe das Bild, um den Ausschnitt zu verschieben. Nutze den Regler zum Zoomen.
            </p>

            <div className="mt-4 flex justify-center">
              <canvas
                ref={cropCanvasRef}
                width={cropPreviewSize}
                height={cropPreviewSize}
                className="rounded-full border border-slate-200 bg-slate-50"
                onPointerDown={handleCropPointerDown}
                onPointerMove={handleCropPointerMove}
                onPointerUp={handleCropPointerUp}
                onPointerLeave={handleCropPointerUp}
              />
            </div>

            <div className="mt-4">
              <input
                type="range"
                min={cropScaleLimits.min}
                max={cropScaleLimits.max}
                step={0.05}
                value={cropScale}
                onChange={(event) => setCropScale(Number(event.target.value))}
                className="w-full"
                aria-label="Zoom"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCropCancel}
                className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-500"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                disabled={isUploadingAvatar}
                className="rounded-lg bg-brand-green-700 px-3 py-2 text-[11px] font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isUploadingAvatar ? "Speichert..." : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div 
            className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-xl border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 mb-3.5">
              <Trash2 className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1.5">Empfehlung löschen</h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Möchtest du diese Empfehlung wirklich unwiderruflich löschen?
            </p>
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => deletePlace(deleteConfirmId)}
                disabled={deletingId === deleteConfirmId}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-red-600 py-3 text-xs font-semibold text-white hover:bg-red-700 shadow-lg shadow-red-600/10 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
              >
                {deletingId === deleteConfirmId ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Löschen"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
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
