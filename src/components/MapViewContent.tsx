"use client";

import React, { useState } from "react";
import Map, { Marker, Popup } from "react-map-gl/mapbox";
import { Search, Users, MapPin, Sparkles } from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  initials: string;
  color: string;
}

interface Place {
  id: string;
  userId: string;
  userName: string;
  userInitials: string;
  userColor: string;
  name: string;
  latitude: number;
  longitude: number;
  isMustSee: boolean;
  review: string;
}

const MOCK_USERS: UserProfile[] = [
  { id: "lukas", name: "Lukas", initials: "L", color: "bg-emerald-600" },
  { id: "marie", name: "Marie", initials: "M", color: "bg-rose-500" },
  { id: "jonas", name: "Jonas", initials: "J", color: "bg-amber-600" },
];

const MOCK_PLACES: Place[] = [
  {
    id: "l1",
    userId: "lukas",
    userName: "Lukas",
    userInitials: "L",
    userColor: "bg-emerald-600",
    name: "Dom St. Peter",
    latitude: 49.0195,
    longitude: 12.0975,
    isMustSee: true,
    review: "Der Dom ist gotische Architektur pur. Am besten morgens besichtigen, wenn das Licht durch die bunten Glasfenster fällt.",
  },
  {
    id: "l2",
    userId: "lukas",
    userName: "Lukas",
    userInitials: "L",
    userColor: "bg-emerald-600",
    name: "Steinerne Brücke",
    latitude: 49.0226,
    longitude: 12.0972,
    isMustSee: true,
    review: "Die älteste erhaltene Brücke Deutschlands. Perfekt für einen Spaziergang rüber nach Stadtamhof mit Blick auf die Donau.",
  },
  {
    id: "l3",
    userId: "lukas",
    userName: "Lukas",
    userInitials: "L",
    userColor: "bg-emerald-600",
    name: "Historische Wurstküche",
    latitude: 49.0223,
    longitude: 12.0977,
    isMustSee: false,
    review: "Direkt an der Steinernen Brücke. Die Bratwürste mit süßem Senf und Sauerkraut sind Kult, aber man muss etwas anstehen.",
  },
  {
    id: "m1",
    userId: "marie",
    userName: "Marie",
    userInitials: "M",
    userColor: "bg-rose-500",
    name: "Stadtamhof",
    latitude: 49.0245,
    longitude: 12.0965,
    isMustSee: true,
    review: "Ein wunderschöner Stadtteil auf der anderen Donauseite. Bunte Häuser, tolle kleine Boutiquen und gemütliche Cafés überall.",
  },
  {
    id: "m2",
    userId: "marie",
    userName: "Marie",
    userInitials: "M",
    userColor: "bg-rose-500",
    name: "Spitalgarten",
    latitude: 49.0242,
    longitude: 12.0988,
    isMustSee: true,
    review: "Toller Biergarten direkt an der Donau in Stadtamhof. Sehr entspannt, gutes Bier und leckeres Essen unter schattigen Bäumen.",
  },
  {
    id: "m3",
    userId: "marie",
    userName: "Marie",
    userInitials: "M",
    userColor: "bg-rose-500",
    name: "Bistro Orphée",
    latitude: 49.0189,
    longitude: 12.0958,
    isMustSee: false,
    review: "Klassisches französisches Bistro-Flair mitten in der Regensburger Altstadt. Hervorragende Weine und tolles Essen.",
  },
  {
    id: "j1",
    userId: "jonas",
    userName: "Jonas",
    userInitials: "J",
    userColor: "bg-amber-600",
    name: "Goldene Ente",
    latitude: 49.0198,
    longitude: 12.1032,
    isMustSee: false,
    review: "Super gemütliches bayerisches Wirtshaus. Die Käsespätzle und das Schnitzel sind legendär!",
  },
  {
    id: "j2",
    userId: "jonas",
    userName: "Jonas",
    userInitials: "J",
    userColor: "bg-amber-600",
    name: "Jahninsel",
    latitude: 49.0229,
    longitude: 12.0945,
    isMustSee: true,
    review: "Der beste Ort in Regensburg, um an einem Sommerabend mit Freunden, Gitarre und ein paar Kaltgetränken auf der Wiese zu entspannen.",
  },
  {
    id: "j3",
    userId: "jonas",
    userName: "Jonas",
    userInitials: "J",
    userColor: "bg-amber-600",
    name: "Bismarckplatz",
    latitude: 49.0188,
    longitude: 12.0898,
    isMustSee: true,
    review: "Ein wunderschöner Platz mit Brunnen vor dem Theater. Abends treffen sich hier alle auf ein Glas Wein oder Bier auf den Stufen.",
  },
];

export default function MapViewContent() {
  const [viewState, setViewState] = useState({
    longitude: 12.1016,
    latitude: 49.0151,
    zoom: 12,
  });

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const handleSelectUser = (userId: string | null) => {
    setSelectedUser(userId);
    setSelectedPlace(null);
  };

  const filteredPlaces = selectedUser
    ? MOCK_PLACES.filter((place) => place.userId === selectedUser)
    : MOCK_PLACES;

  if (!mapboxToken) {
    return (
      <div className="flex h-full w-full flex-1 flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="rounded-full bg-red-50 p-3 text-red-500">
          <MapPin className="h-8 w-8" />
        </div>
        <h3 className="mt-4 font-semibold text-slate-800">Mapbox Token fehlt</h3>
        <p className="mt-2 text-sm text-slate-500 max-w-xs">
          Bitte stelle sicher, dass `NEXT_PUBLIC_MAPBOX_TOKEN` in deiner `.env.local` definiert ist.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full flex-1 flex flex-col">

      {/* Floating Friends Filter Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => handleSelectUser(null)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.03)] backdrop-blur-md active:scale-95 ${
            selectedUser === null
              ? "bg-brand-green-800 border-brand-green-800 text-white"
              : "bg-white/95 border-slate-100 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Alle</span>
        </button>

        {MOCK_USERS.map((user) => (
          <button
            key={user.id}
            onClick={() => handleSelectUser(user.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.03)] backdrop-blur-md active:scale-95 ${
              selectedUser === user.id
                ? "bg-brand-green-800 border-brand-green-800 text-white"
                : "bg-white/95 border-slate-100 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white ${user.color}`}>
              {user.initials}
            </div>
            <span>{user.name}</span>
          </button>
        ))}
      </div>

      {/* Mapbox Map */}
      <div className="w-full h-full flex-1">
        <Map
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          style={{ width: "100%", height: "100%" }}
          mapStyle="mapbox://styles/mapbox/light-v11"
          mapboxAccessToken={mapboxToken}
        >
          {filteredPlaces.map((place) => (
            <Marker
              key={place.id}
              latitude={place.latitude}
              longitude={place.longitude}
              anchor="bottom"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPlace(place);
                }}
                className="group relative flex flex-col items-center cursor-pointer transition-transform duration-200 hover:scale-110 active:scale-95"
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border border-white shadow-lg transition-colors duration-200 ${
                  place.isMustSee
                    ? "bg-amber-500 text-white shadow-amber-500/30"
                    : "bg-brand-green-700 text-white shadow-brand-green-700/30"
                }`}>
                  {place.isMustSee ? (
                    <Sparkles className="h-4 w-4 fill-amber-300" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                </div>
                <div className="absolute -top-8 bg-slate-900/90 text-white text-[10px] px-2 py-0.5 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none font-medium backdrop-blur-sm">
                  {place.name}
                </div>
              </button>
            </Marker>
          ))}

          {selectedPlace && (
            <Popup
              latitude={selectedPlace.latitude}
              longitude={selectedPlace.longitude}
              onClose={() => setSelectedPlace(null)}
              anchor="top"
              closeButton={false}
              className="z-20 font-sans"
              maxWidth="260px"
            >
              <div className="p-3 bg-white rounded-xl shadow-sm text-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-sm text-slate-900">{selectedPlace.name}</h4>
                  {selectedPlace.isMustSee && (
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 ring-1 ring-amber-600/15">
                      <Sparkles className="h-2.5 w-2.5 text-amber-500 fill-amber-400 animate-pulse" />
                      Must See
                    </span>
                  )}
                </div>
                
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                  <div className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white ${selectedPlace.userColor}`}>
                    {selectedPlace.userInitials}
                  </div>
                  <span>Empfohlen von {selectedPlace.userName}</span>
                </div>

                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  {selectedPlace.review}
                </p>
              </div>
            </Popup>
          )}
        </Map>
      </div>
    </div>
  );
}

