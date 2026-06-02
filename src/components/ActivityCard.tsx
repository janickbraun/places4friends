"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MapPin, Sparkles, X, Navigation } from "lucide-react";

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
  bottomLeftActions?: React.ReactNode;
  isEditing?: boolean;
  editForm?: React.ReactNode;
  children?: React.ReactNode;
  imageUrls?: string[];
  cardless?: boolean;
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
  bottomLeftActions,
  isEditing = false,
  editForm,
  children,
  imageUrls = [],
  cardless = false,
}: ActivityCardProps) {
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const hasCoordinates =
    latitude !== undefined &&
    latitude !== null &&
    longitude !== undefined &&
    longitude !== null;

  return (
    <div
      className={
        cardless
          ? "group p-0"
          : "group rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all duration-300"
      }
    >
      {/* Main Content Area */}
      {isEditing && editForm ? (
        <div className="space-y-3">
          {editForm}
          {actions && (
            <div className="flex justify-end pt-3 border-t border-slate-100">
              {actions}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* TOP: Place Name and Must See */}
          <div className="flex items-start justify-between gap-3">
            <Link
              href={`/activities/${id}`}
              className="flex items-center gap-1.5 group/link cursor-pointer hover:underline decoration-brand-green-700/40"
            >
              <MapPin className="h-4 w-4 text-brand-green-700 flex-shrink-0 group-hover/link:text-brand-green-800 transition-colors" />
              <h3 className="font-bold text-base text-slate-900 group-hover/link:text-brand-green-700 transition-colors">
                {placeName}
              </h3>
            </Link>
            
            {/* Top Right Actions (like Edit menu) & Must See & Timestamp */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isMustSee && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-600/15 shadow-sm">
                  <Sparkles className="h-3 w-3 text-amber-500 fill-amber-400 animate-pulse" />
                  Must See
                </span>
              )}
              {timestamp && (
                <span className="text-[10px] text-slate-400 font-medium select-none">
                  {timestamp}
                </span>
              )}
              {actions}
            </div>
          </div>

          {/* Media Section: Map Screenshot and Uploaded Images Side-by-Side */}
          {((hasCoordinates ? 1 : 0) + imageUrls.length) > 0 && (
            <div className="pt-1">
              <div className={`grid gap-2 ${
                ((hasCoordinates ? 1 : 0) + imageUrls.length) === 1 ? "grid-cols-1" :
                ((hasCoordinates ? 1 : 0) + imageUrls.length) === 2 ? "grid-cols-2" :
                ((hasCoordinates ? 1 : 0) + imageUrls.length) === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"
              }`}>
                {/* Map Screenshot (first in grid if coordinates exist) */}
                {hasCoordinates && (
                  <div className={`relative rounded-xl overflow-hidden border border-slate-100 bg-slate-50 ${
                    ((hasCoordinates ? 1 : 0) + imageUrls.length) === 1 ? "aspect-[21/9] max-h-32" : "aspect-square"
                  }`}>
                    <img 
                      src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+22c55e(${longitude},${latitude})/${longitude},${latitude},15.5/${((hasCoordinates ? 1 : 0) + imageUrls.length) === 1 ? "800x300" : "600x600"}@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
                      alt={`Karte von ${placeName}`}
                      className="w-full h-full object-cover"
                    />
                    <Link 
                      href={`/?lat=${latitude}&lng=${longitude}&placeId=${id}`}
                      className="absolute inset-0 bg-transparent"
                      title="Auf Karte anzeigen"
                    />
                  </div>
                )}

                {/* Uploaded Images */}
                {imageUrls && imageUrls.length > 0 && imageUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className={`relative rounded-xl overflow-hidden border border-slate-100 bg-slate-50 cursor-pointer shadow-sm active:scale-[0.99] transition-all ${
                      ((hasCoordinates ? 1 : 0) + imageUrls.length) === 1 ? "aspect-[16/10] max-h-56" : "aspect-square"
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

          {/* Description / Review Text */}
          {description && description.trim() !== "" && (
            <p className="text-sm leading-relaxed text-slate-600">
              {description}
            </p>
          )}

          {/* Categories Tags */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {categories.map((category) => (
                <span
                  key={category}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                >
                  {category}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Embedded Children & Bottom Actions */}
      {!isEditing && (
        <div className="mt-3 space-y-3">
          {/* Friend Header if friend info is provided */}
          {friend && (
            <div className="flex items-center gap-2">
              <Link href={`/profile/${friend.id}`} className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                <div
                  className={`flex h-6 w-6 items-center justify-center overflow-hidden rounded-full text-[9px] font-bold text-white shadow-sm ${friend.color}`}
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
                <span className="text-[11px] font-bold text-slate-700">
                  {friend.name}
                </span>
              </Link>
            </div>
          )}

          {/* Action buttons row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {bottomLeftActions}
            </div>
            <a 
              href={hasCoordinates ? `https://maps.google.com/?q=${latitude},${longitude}` : `https://maps.google.com/?q=${encodeURIComponent(placeName)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              Navigation
            </a>
          </div>
          {children}
        </div>
      )}

      {/* Lightbox Modal */}
      {activeImageUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm transition-all duration-300"
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
