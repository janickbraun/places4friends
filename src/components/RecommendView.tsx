"use client";

import React, { useMemo, useState } from "react";
import Map, { Marker } from "react-map-gl/mapbox";
import {
  Search,
  MessageSquare,
  Check,
  Sparkles,
  MapPin,
  Loader2,
} from "lucide-react";

interface PlaceResult {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  source: "google" | "mapbox" | "manual";
}

const CATEGORIES = [
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

export default function RecommendView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [customPlaceName, setCustomPlaceName] = useState("");
  const [customCoords, setCustomCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [customViewState, setCustomViewState] = useState({
    longitude: 12.1016,
    latitude: 49.0151,
    zoom: 11,
  });
  const [isSuperLike, setIsSuperLike] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);

  const canSave = useMemo(() => {
    if (selectedPlace) return true;
    return customPlaceName.trim().length > 0;
  }, [selectedPlace, customPlaceName]);

  const resetForm = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedPlace(null);
    setCustomPlaceName("");
    setCustomCoords(null);
    setIsSuperLike(false);
    setSelectedCategories([]);
    setDescription("");
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    );
  };

  const runSearch = async () => {
    setFeedback(null);
    setIsSearching(true);

    let activeCoords: any = null;

    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set("query", searchQuery.trim());
    }
    if (activeCoords) {
      params.set("lat", String(activeCoords.lat));
      params.set("lng", String(activeCoords.lng));
    }
    try {
      const response = await fetch(`/api/places/search?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Suche fehlgeschlagen.");
      }
      setSearchResults(data.results ?? []);
      setSelectedPlace(null);
    } catch (error) {
      setSearchResults([]);
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Suche fehlgeschlagen.",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    if (!canSave) return;

    const payload = selectedPlace
      ? {
          placeId: selectedPlace.id,
          placeName: selectedPlace.name,
          placeAddress: selectedPlace.address,
          latitude: selectedPlace.latitude,
          longitude: selectedPlace.longitude,
        }
      : {
          placeId: null,
          placeName: customPlaceName.trim(),
          placeAddress: null,
          latitude: customCoords?.lat ?? null,
          longitude: customCoords?.lng ?? null,
        };

    setIsSaving(true);
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          isSuperLike,
          categories: selectedCategories,
          description: description.trim() || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Speichern fehlgeschlagen.");
      }
      setFeedback({
        type: "success",
        message: "Empfehlung gespeichert.",
      });
      resetForm();
      setTimeout(() => setFeedback(null), 2500);
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Speichern fehlgeschlagen.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative flex flex-col min-h-screen bg-slate-50/50 pb-28 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-100 bg-white px-4">
        <h1 className="text-lg font-bold text-slate-900">Ort empfehlen</h1>
        <Sparkles className="h-5 w-5 text-brand-green-500" />
      </header>

      {/* Main Form Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 page-transition">
        {feedback?.type === "success" ? (
          <div className="my-8 flex flex-col items-center justify-center rounded-2xl border border-brand-green-100 bg-brand-green-50 p-8 text-center shadow-sm transition-all duration-300">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-green-500 text-white shadow-lg shadow-brand-green-500/20">
              <Check className="h-6 w-6 stroke-[3]" />
            </div>
            <h3 className="mt-4 text-base font-bold text-brand-green-900">Erfolgreich empfohlen!</h3>
            <p className="mt-1.5 text-xs text-brand-green-700/80 max-w-xs">
              Dein Ort wurde in deine Aktivitaet aufgenommen.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            {/* Search Input Box */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Ort waehlen
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex flex-1 items-center rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm focus-within:border-brand-green-500 focus-within:ring-2 focus-within:ring-brand-green-100 transition-all">
                  <Search className="h-5 w-5 text-slate-400 mr-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ort suchen"
                    className="w-full bg-transparent text-[14px] text-slate-800 placeholder-slate-400 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={runSearch}
                  disabled={isSearching}
                  className="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:text-slate-900 disabled:opacity-60"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Suchen"}
                </button>
              </div>

            </div>

            {feedback?.type === "error" && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                {feedback.message}
              </div>
            )}

            {/* Search Results */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Treffer
              </label>
              {searchResults.length === 0 ? (
                <div className="rounded-xl border border-slate-100 bg-white px-3 py-3 text-xs text-slate-500">
                  Keine Treffer. Du kannst einen Ort manuell eintragen.
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((place) => (
                    <button
                      type="button"
                      key={place.id}
                      onClick={() => {
                        setSelectedPlace(place);
                        setCustomPlaceName("");
                      }}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition-all ${
                        selectedPlace?.id === place.id
                          ? "border-brand-green-200 bg-brand-green-50"
                          : "border-slate-100 bg-white hover:border-slate-200"
                      }`}
                    >
                      <div className="text-sm font-semibold text-slate-800">
                        {place.name}
                      </div>
                      {place.address && (
                        <div className="text-xs text-slate-500">{place.address}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Manual Place Entry */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Ort manuell eintragen
              </label>
              <div className="space-y-2 rounded-xl border border-slate-100 bg-white p-3">
                <input
                  type="text"
                  value={customPlaceName}
                  onChange={(e) => {
                    setCustomPlaceName(e.target.value);
                    if (selectedPlace) setSelectedPlace(null);
                  }}
                  placeholder="Name des Ortes"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-green-500"
                />
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2">
                  <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span>Pin auf der Karte setzen (optional)</span>
                    {customCoords && (
                      <button
                        type="button"
                        onClick={() => setCustomCoords(null)}
                        className="text-[10px] font-semibold text-slate-400 hover:text-slate-600"
                      >
                        Pin entfernen
                      </button>
                    )}
                  </div>
                  <div className="h-44 overflow-hidden rounded-lg border border-slate-200 bg-white">
                    {process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? (
                      <Map
                        {...customViewState}
                        onMove={(evt) => setCustomViewState(evt.viewState)}
                        onClick={(evt) => {
                          const { lng, lat } = evt.lngLat;
                          setCustomCoords({ lat, lng });
                          setSelectedPlace(null);
                        }}
                        style={{ width: "100%", height: "100%" }}
                        mapStyle="mapbox://styles/mapbox/light-v11"
                        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                      >
                        {customCoords && (
                          <Marker
                            longitude={customCoords.lng}
                            latitude={customCoords.lat}
                            anchor="bottom"
                          >
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-green-700 text-white shadow-lg shadow-brand-green-700/30">
                              <MapPin className="h-4 w-4" />
                            </div>
                          </Marker>
                        )}
                      </Map>
                    ) : (
                      <div className="flex h-full items-center justify-center text-center text-[11px] text-slate-400 px-3">
                        Mapbox Token fehlt. Bitte `NEXT_PUBLIC_MAPBOX_TOKEN` setzen.
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Tipp: Klicke auf die Karte, um den Pin zu setzen.
                  </p>
                </div>
              </div>
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Kategorien
              </label>
              <div className="rounded-xl border border-slate-100 bg-white p-3">
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((category) => {
                    const isSelected = selectedCategories.includes(category);
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => toggleCategory(category)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                          isSelected
                            ? "border-brand-green-600 bg-brand-green-50 text-brand-green-800"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  Mehrfachauswahl moeglich.
                </p>
              </div>
            </div>

            {/* Superlike Toggle */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Like oder Superlike
              </label>
              <button
                type="button"
                onClick={() => setIsSuperLike(!isSuperLike)}
                className={`relative w-full flex items-center justify-between overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 cursor-pointer ${
                  isSuperLike
                    ? "border-amber-200 bg-amber-50/50 shadow-md shadow-amber-500/5 ring-1 ring-amber-400/30"
                    : "border-slate-200 bg-white hover:border-slate-300 shadow-sm"
                }`}
              >
                {isSuperLike && (
                  <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-amber-200/20 blur-xl pointer-events-none" />
                )}
                <div className="flex items-center gap-3.5 z-10">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300 ${
                      isSuperLike
                        ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-md shadow-amber-500/30 rotate-6"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <Sparkles className={`h-5.5 w-5.5 ${isSuperLike ? "animate-pulse" : ""}`} />
                  </div>
                  <div>
                    <h4
                      className={`text-sm font-bold transition-colors ${
                        isSuperLike ? "text-amber-900" : "text-slate-700"
                      }`}
                    >
                      Superlike
                    </h4>
                    <p
                      className={`text-xs mt-0.5 transition-colors ${
                        isSuperLike ? "text-amber-800/80" : "text-slate-400"
                      }`}
                    >
                      Markiere diesen Ort als besonderes Highlight.
                    </p>
                  </div>
                </div>

                <div
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 p-0.5 cursor-pointer z-10 ${
                    isSuperLike ? "bg-amber-500" : "bg-slate-200"
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                      isSuperLike ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              </button>
            </div>

            {/* Description Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Beschreibung (optional)
              </label>
              <div className="relative flex rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm focus-within:border-brand-green-500 focus-within:ring-2 focus-within:ring-brand-green-100 transition-all">
                <MessageSquare className="h-5 w-5 text-slate-400 mr-2.5 mt-0.5" />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Was macht diesen Ort besonders?"
                  rows={4}
                  className="w-full bg-transparent text-[14px] text-slate-800 placeholder-slate-400 outline-none resize-none"
                />
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Save Button */}
      {feedback?.type !== "success" && (
        <div className="absolute bottom-20 left-0 right-0 z-40 px-4">
          <button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold shadow-lg text-white transition-all cursor-pointer ${
              canSave && !isSaving
                ? "bg-brand-green-700 shadow-brand-green-900/10 active:scale-[0.98] hover:bg-brand-green-800"
                : "bg-slate-300 shadow-none cursor-not-allowed opacity-80"
            }`}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            Empfehlung speichern
          </button>
        </div>
      )}
    </div>
  );
}
