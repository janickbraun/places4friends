"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker } from "react-map-gl/mapbox";
import {
  Search,
  MessageSquare,
  Check,
  Sparkles,
  MapPin,
  Loader2,
  Image as ImageIcon,
  X,
  ChevronDown,
  ChevronUp,
  PenLine,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface PlaceResult {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  source: "google" | "mapbox" | "manual";
}

interface SearchSuggestion {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  type?: string;
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

type FormStep = "map" | "form";

export default function RecommendView() {
  // Map state
  const mapRef = useRef<any>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [viewState, setViewState] = useState({
    longitude: 12.1016,
    latitude: 49.0151,
    zoom: 11,
  });

  // Selected pin
  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedSearchResult, setSelectedSearchResult] = useState<PlaceResult | null>(null);

  // Step: "map" = full map + search shown, "form" = bottom sheet slid up
  const [formStep, setFormStep] = useState<FormStep>("map");

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Form fields (pre-filled from place selection but editable)
  const [placeName, setPlaceName] = useState("");
  const [placeAddress, setPlaceAddress] = useState("");
  const [isSuperLike, setIsSuperLike] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);

  const savedMapStyle =
    typeof window !== "undefined"
      ? (localStorage.getItem("mapStyle") ?? "mapbox://styles/mapbox/streets-v12")
      : "mapbox://styles/mapbox/streets-v12";

  const canSave = useMemo(() => placeName.trim().length > 0, [placeName]);

  // ----------------------------------------------------------------
  // Search logic (debounced)
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        let url = `/api/places/search?query=${encodeURIComponent(searchQuery)}`;
        if (viewState.latitude && viewState.longitude) {
          url += `&lat=${viewState.latitude}&lng=${viewState.longitude}`;
        }
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const results: SearchSuggestion[] = (data.results || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            address: item.address || "",
            latitude: item.latitude,
            longitude: item.longitude,
            type: item.type,
          }));
          setSuggestions(results);
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, viewState.latitude, viewState.longitude]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ----------------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------------
  const openFormWithPlace = useCallback(
    (name: string, lat: number | null, lng: number | null, placeId?: string) => {
      setPlaceName(name);
      if (lat && lng) {
        setPinCoords({ lat, lng });
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 15, duration: 1200 });
        setViewState((prev) => ({ ...prev, latitude: lat, longitude: lng, zoom: 15 }));
      }
      setFormStep("form");
      setShowSuggestions(false);
    },
    []
  );

  const handleSelectSuggestion = (s: SearchSuggestion) => {
    setSearchQuery(s.name);
    setSelectedSearchResult({
      id: s.id,
      name: s.name,
      address: s.address,
      latitude: s.latitude,
      longitude: s.longitude,
      source: "mapbox",
    });
    setPlaceAddress(s.address || "");
    openFormWithPlace(s.name, s.latitude, s.longitude);
  };

  const handleMapClick = (evt: any) => {
    // Only handle click if the target is the map canvas itself
    const target = evt.originalEvent?.target as HTMLElement | undefined;
    if (!target || !target.classList.contains("mapboxgl-canvas")) {
      return;
    }

    const { lng, lat } = evt.lngLat;
    setPinCoords({ lat, lng });
    setSelectedSearchResult(null);

    let detectedName = "";
    let detectedAddress = "";
    if (mapRef.current) {
      try {
        const features = mapRef.current.queryRenderedFeatures(evt.point);
        const poiFeature = features?.find((f: any) => {
          const layerId = f.layer?.id || "";
          const sourceLayer = f.sourceLayer || "";
          const hasName = f.properties && (f.properties.name || f.properties.name_de || f.properties.name_en);
          
          const isLabelOrPoi = 
            layerId.includes("poi") ||
            sourceLayer.includes("poi") ||
            layerId.includes("label") ||
            sourceLayer.includes("label") ||
            layerId.includes("symbol") ||
            layerId.includes("landmark") ||
            layerId.includes("monument");
            
          return isLabelOrPoi && hasName;
        }) || features?.find((f: any) => f.properties && (f.properties.name || f.properties.name_de || f.properties.name_en));

        if (poiFeature) {
          detectedName = poiFeature.properties.name_de || poiFeature.properties.name || poiFeature.properties.name_en || "";
          detectedAddress = poiFeature.properties.address || poiFeature.properties.place_name || "";
        }
      } catch (err) {
        console.error("Error querying features:", err);
      }
    }

    if (detectedName) {
      setPlaceName(detectedName);
    } else {
      setPlaceName("");
    }
    setPlaceAddress(detectedAddress);

    setFormStep("form");
    setShowSuggestions(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && suggestions.length > 0) {
      handleSelectSuggestion(suggestions[0]);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleCloseForm = () => {
    setFormStep("map");
    setPinCoords(null);
    setSelectedSearchResult(null);
  };

  const resetAll = () => {
    setFormStep("map");
    setSearchQuery("");
    setSuggestions([]);
    setPinCoords(null);
    setSelectedSearchResult(null);
    setPlaceName("");
    setPlaceAddress("");
    setIsSuperLike(false);
    setSelectedCategories([]);
    setDescription("");
    setSelectedFiles([]);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => {
        const combined = [...prev, ...filesArray];
        if (combined.length > 3) {
          setFeedback({ type: "error", message: "Du kannst maximal 3 Bilder hochladen." });
          return combined.slice(0, 3);
        }
        return combined;
      });
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    if (!canSave) return;

    const payload = {
      placeId: selectedSearchResult?.id ?? null,
      placeName: placeName.trim(),
      placeAddress: placeAddress.trim() || null,
      latitude: pinCoords?.lat ?? selectedSearchResult?.latitude ?? null,
      longitude: pinCoords?.lng ?? selectedSearchResult?.longitude ?? null,
    };

    setIsSaving(true);
    let uploadedUrls: string[] = [];

    try {
      if (selectedFiles.length > 0) {
        const supabase = createClient();
        for (const file of selectedFiles) {
          const fileExt = file.name.split(".").pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from("activity-images")
            .upload(fileName, file);
          if (uploadError) throw new Error(`Fehler beim Hochladen eines Bildes: ${uploadError.message}`);
          const {
            data: { publicUrl },
          } = supabase.storage.from("activity-images").getPublicUrl(fileName);
          uploadedUrls.push(publicUrl);
        }
      }

      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          isSuperLike,
          categories: selectedCategories,
          description: description.trim() || null,
          imageUrls: uploadedUrls,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Speichern fehlgeschlagen.");

      setFeedback({ type: "success", message: "Empfehlung gespeichert." });
      resetAll();
      setTimeout(() => setFeedback(null), 3000);
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Speichern fehlgeschlagen.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-slate-50">
      {/* ── Success Overlay ── */}
      {feedback?.type === "success" && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-green-500 text-white shadow-xl shadow-brand-green-500/30">
            <Check className="h-8 w-8 stroke-[3]" />
          </div>
          <h3 className="mt-5 text-lg font-bold text-brand-green-900">Erfolgreich empfohlen!</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-xs text-center">
            Dein Ort wurde in deine Aktivitaet aufgenommen.
          </p>
        </div>
      )}

      {/* ── Full-screen Map ── */}
      <div className="absolute inset-0">
        {mapboxToken ? (
          <Map
            ref={mapRef}
            {...viewState}
            onMove={(evt) => setViewState(evt.viewState)}
            onClick={handleMapClick}
            style={{ width: "100%", height: "100%" }}
            mapStyle={savedMapStyle}
            mapboxAccessToken={mapboxToken}
            cursor={formStep === "map" ? "crosshair" : "grab"}
          >
            {pinCoords && (
              <Marker longitude={pinCoords.lng} latitude={pinCoords.lat} anchor="bottom">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-green-700 text-white shadow-lg shadow-brand-green-700/40 border-2 border-white animate-in zoom-in-75 duration-200">
                  <MapPin className="h-5 w-5" />
                </div>
              </Marker>
            )}
          </Map>
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-100 text-center text-sm text-slate-500 px-6">
            Mapbox Token fehlt. Bitte <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> setzen.
          </div>
        )}
      </div>

      {/* ── Floating Search Bar ── */}
      <div
        ref={searchContainerRef}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        className={`absolute left-4 right-4 z-20 transition-all duration-300 ${
          formStep === "form" ? "top-4 opacity-60 pointer-events-none" : "top-4"
        }`}
      >
        <div className="relative flex items-center bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.10)] px-4 py-3 transition-all duration-300 focus-within:ring-2 focus-within:ring-brand-green-700/20">
          <Search className="h-4 w-4 text-slate-400 mr-3 flex-shrink-0" />
          <input
            type="text"
            placeholder="Ort suchen oder auf Karte tippen..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
              if (formStep === "form") setFormStep("map");
            }}
            onFocus={() => {
              setShowSuggestions(true);
              if (formStep === "form") setFormStep("map");
            }}
            onKeyDown={handleSearchKeyDown}
            className="w-full bg-transparent text-sm text-slate-800 focus:outline-none placeholder-slate-400 font-medium"
          />
          {isSearching && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-green-700 flex-shrink-0 mr-1" />}
          {searchQuery && !isSearching && (
            <button
              onClick={clearSearch}
              className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-full hover:bg-slate-100 flex-shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && (suggestions.length > 0 || isSearching) && formStep === "map" && (
          <div className="absolute left-0 right-0 mt-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.10)] max-h-72 overflow-y-auto z-30 py-2 divide-y divide-slate-50">
            {isSearching && suggestions.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-3 text-xs text-slate-400 font-medium">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-green-700" />
                <span>Ort wird gesucht...</span>
              </div>
            ) : (
              suggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectSuggestion(s)}
                  className="w-full flex items-start text-left px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors gap-3 group"
                >
                  <div className="mt-0.5 p-1.5 rounded-full bg-slate-50 text-slate-400 flex-shrink-0">
                    <MapPin className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-slate-800 truncate block group-hover:text-brand-green-800 transition-colors">
                      {s.name}
                    </span>
                    {s.address && (
                      <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                        {s.address}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Sheet Form ── */}
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        className={`absolute left-0 right-0 z-30 transition-transform duration-500 ease-out will-change-transform ${
          formStep === "form" ? "translate-y-0" : "translate-y-full pointer-events-none invisible"
        }`}
        style={{ 
          bottom: "calc(3rem + env(safe-area-inset-bottom))",
          maxHeight: "calc(80vh - 3rem - env(safe-area-inset-bottom))"
        }}
      >
        <div className="bg-white rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden" style={{ maxHeight: "calc(80vh - 3rem - env(safe-area-inset-bottom))" }}>
          {/* Sheet Handle */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-green-50">
                <PenLine className="h-3.5 w-3.5 text-brand-green-700" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Ort empfehlen</h2>
            </div>
            <button
              onClick={handleCloseForm}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <ChevronDown className="h-4 w-4 text-slate-600" />
            </button>
          </div>

          {/* Scrollable form body */}
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-5 py-4 space-y-5 pb-8">

            {/* Error feedback */}
            {feedback?.type === "error" && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-700 flex items-start gap-2">
                <X className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                {feedback.message}
              </div>
            )}

            {/* Place Name (pre-filled, editable) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Name des Ortes
              </label>
              <div className="relative flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 focus-within:border-brand-green-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-green-100 transition-all">
                <MapPin className="h-4 w-4 text-slate-400 mr-2.5 flex-shrink-0" />
                <input
                  type="text"
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  placeholder="Name des Ortes eingeben"
                  required
                  className="w-full bg-transparent text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none"
                />
                {placeName && (
                  <button
                    type="button"
                    onClick={() => setPlaceName("")}
                    className="text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Address / Street */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Adresse / Straße (optional)
              </label>
              <div className="relative flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 focus-within:border-brand-green-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-green-100 transition-all">
                <Search className="h-4 w-4 text-slate-400 mr-2.5 flex-shrink-0" />
                <input
                  type="text"
                  value={placeAddress}
                  onChange={(e) => setPlaceAddress(e.target.value)}
                  placeholder="Straße, Hausnummer, Ort"
                  className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
                />
                {placeAddress && (
                  <button
                    type="button"
                    onClick={() => setPlaceAddress("")}
                    className="text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {pinCoords && (
                <p className="text-[10px] text-slate-400 pl-1">
                  Pin gesetzt: {pinCoords.lat.toFixed(5)}, {pinCoords.lng.toFixed(5)}
                  <button
                    type="button"
                    onClick={() => setPinCoords(null)}
                    className="ml-2 text-slate-400 underline hover:text-slate-600"
                  >
                    entfernen
                  </button>
                </p>
              )}
            </div>

            {/* Category Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Kategorien
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((category) => {
                  const isSelected = selectedCategories.includes(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                        isSelected
                          ? "border-brand-green-600 bg-brand-green-50 text-brand-green-800 shadow-sm shadow-brand-green-500/10"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Superlike Toggle */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
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
                    className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${
                      isSuperLike
                        ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-md shadow-amber-500/30 rotate-6"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <Sparkles className={`h-5 w-5 ${isSuperLike ? "animate-pulse" : ""}`} />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold transition-colors ${isSuperLike ? "text-amber-900" : "text-slate-700"}`}>
                      Superlike
                    </h4>
                    <p className={`text-xs mt-0.5 transition-colors ${isSuperLike ? "text-amber-800/80" : "text-slate-400"}`}>
                      Markiere diesen Ort als besonderes Highlight.
                    </p>
                  </div>
                </div>
                <div
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 p-0.5 z-10 ${
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

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Beschreibung (optional)
              </label>
              <div className="relative flex rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm focus-within:border-brand-green-500 focus-within:ring-2 focus-within:ring-brand-green-100 transition-all">
                <MessageSquare className="h-4 w-4 text-slate-400 mr-2.5 mt-0.5 flex-shrink-0" />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Was macht diesen Ort besonders?"
                  rows={3}
                  className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none resize-none"
                />
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Bilder (optional, max. 3)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {selectedFiles.map((file, idx) => {
                  const previewUrl = URL.createObjectURL(file);
                  return (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-100 bg-slate-50 group">
                      <img src={previewUrl} alt="Vorschau" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/60 text-white hover:bg-slate-950 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
                {selectedFiles.length < 3 && (
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-50 transition-all hover:border-brand-green-500 group">
                    <ImageIcon className="h-5 w-5 text-slate-400 group-hover:text-brand-green-600 transition-colors" />
                    <span className="mt-1 text-[10px] font-semibold text-slate-400 group-hover:text-brand-green-600 transition-colors">
                      Bild hinzufuegen
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
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
          </form>
        </div>
      </div>
    </div>
  );
}
