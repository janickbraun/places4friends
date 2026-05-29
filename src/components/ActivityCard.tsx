"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MapPin, Sparkles, X } from "lucide-react";

export interface FriendInfo {
  id: string;
  name: string;
  username: string;
  initials: string;
  color: string;
  avatarUrl?: string | null;
}

export interface ActivityCardProps {
  id: string;
  placeName: string;
  latitude?: number | null;
  longitude?: number | null;
  isMustSee?: boolean;
  description?: string;
  categories?: string[];
  timestamp?: string;
  friend?: FriendInfo;
  actions?: React.ReactNode;
  isEditing?: boolean;
  editForm?: React.ReactNode;
  children?: React.ReactNode;
  imageUrls?: string[];
}

export default function ActivityCard({
  id,
  placeName,
  latitude,
  longitude,
  isMustSee = false,
  description,
  categories = [],
  timestamp,
  friend,
  actions,
  isEditing = false,
  editForm,
  children,
  imageUrls = [],
}: ActivityCardProps) {
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const hasCoordinates =
    latitude !== undefined &&
    latitude !== null &&
    longitude !== undefined &&
    longitude !== null;

  return (
    <div className="group rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all duration-300">
      {/* Friend Header if friend info is provided */}
      {friend && (
        <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-3">
          <Link href={`/profile/${friend.id}`} className="flex items-center gap-2.5 hover:opacity-90">
            <div
              className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-white shadow-sm ${friend.color}`}
            >
              {friend.avatarUrl ? (
                <img
                  src={friend.avatarUrl}
                  alt="Profilbild"
                  className="h-full w-full object-cover"
                />
              ) : (
                friend.initials
              )}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">
                {friend.name}
              </h4>
              {friend.username && (
                <p className="text-[10px] font-semibold text-brand-green-700">
                  @{friend.username}
                </p>
              )}
            </div>
          </Link>
          {timestamp && (
            <span className="text-[10px] text-slate-400 font-medium">
              {timestamp}
            </span>
          )}
        </div>
      )}

      {/* Main Content Area */}
      {isEditing && editForm ? (
        <div className="space-y-3">
          {editForm}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            {/* Title / Name (as Link to Map if coordinates exist) */}
            {hasCoordinates ? (
              <Link
                href={`/?lat=${latitude}&lng=${longitude}&placeId=${id}`}
                className="flex items-center gap-1.5 group/link cursor-pointer hover:underline decoration-brand-green-700/40"
              >
                <MapPin className="h-4 w-4 text-brand-green-700 flex-shrink-0 group-hover/link:text-brand-green-800 transition-colors" />
                <h3 className="font-bold text-sm text-slate-900 group-hover/link:text-brand-green-700 transition-colors">
                  {placeName}
                </h3>
              </Link>
            ) : (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-brand-green-700 flex-shrink-0" />
                <h3 className="font-bold text-sm text-slate-900">
                  {placeName}
                </h3>
              </div>
            )}

            {/* Actions & Optional Timestamp (rendered here if no Friend Header exists) */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {isMustSee && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700 ring-1 ring-amber-600/15 shadow-sm">
                  <Sparkles className="h-2.5 w-2.5 text-amber-500 fill-amber-400 animate-pulse" />
                  Must See
                </span>
              )}
              {!friend && timestamp && (
                <span className="text-[10px] text-slate-400 font-medium mr-1">{timestamp}</span>
              )}
              {actions}
            </div>
          </div>

          {/* Description / Review Text */}
          {description && description.trim() !== "" && (
            <p className="text-xs leading-relaxed text-slate-600 pl-5">
              {description}
            </p>
          )}

          {/* Image Gallery */}
          {imageUrls && imageUrls.length > 0 && (
            <div className="pl-5 pt-2">
              <div className={`grid gap-2 ${
                imageUrls.length === 1 ? "grid-cols-1" :
                imageUrls.length === 2 ? "grid-cols-2" : "grid-cols-3"
              }`}>
                {imageUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className={`relative rounded-xl overflow-hidden border border-slate-100 bg-slate-50 cursor-pointer shadow-sm active:scale-[0.99] transition-all ${
                      imageUrls.length === 1 ? "aspect-[16/10] max-h-56" : "aspect-square"
                    }`}
                    onClick={() => setActiveImageUrl(url)}
                  >
                    <img
                      src={url}
                      alt={`Bild ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categories Tags */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1.5 pl-5">
              {categories.map((category) => (
                <span
                  key={category}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-semibold text-slate-600"
                >
                  {category}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Embedded Children (e.g. comments list) */}
      {children}

      {/* Lightbox Modal */}
      {activeImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm transition-all duration-300"
          onClick={() => setActiveImageUrl(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-black shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img src={activeImageUrl} alt="Fullscreen View" className="max-h-[85vh] max-w-[85vw] object-contain" />
            <button
              onClick={() => setActiveImageUrl(null)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/85 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
