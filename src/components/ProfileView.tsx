"use client";

import React from "react";
import Link from "next/link";
import { Settings, Sparkles, LogOut, UserPlus } from "lucide-react";
import { signout } from "@/app/login/actions";

interface User {
  id: string;
  email: string;
  name?: string | null;
  username?: string | null;
}

interface PlaceItem {
  id: string;
  name: string;
  isMustSee?: boolean;
  review: string;
  timestamp: string;
}

export default function ProfileView({ user, friendsCount = 0 }: { user?: User; friendsCount?: number }) {
  const places: PlaceItem[] = [
    {
      id: "1",
      name: "Café Kranzler",
      isMustSee: true,
      review: "Immer noch einer der besten Kaffees der Stadt. Der Außenbereich oben ist perfekt, um im Sommer Leute zu beobachten.",
      timestamp: "vor 2 Std.",
    },
    {
      id: "2",
      name: "Tempelhofer Feld",
      isMustSee: true,
      review: "Unendliche Weite mitten in Berlin. Perfekt zum Skaten, Spazierengehen oder um einfach den Sonnenuntergang mit einem Bierchen zu genießen.",
      timestamp: "gestern",
    },
    {
      id: "3",
      name: "Markthalle Neun",
      isMustSee: false,
      review: "Sehr leckeres Essen beim Street Food Thursday, allerdings mittlerweile extrem voll. Trotzdem einen Besuch wert!",
      timestamp: "vor 3 Tagen",
    },
    {
      id: "4",
      name: "Michelberger Restaurant",
      isMustSee: true,
      review: "Fantastisches Farm-to-Table-Konzept. Die Karte wechselt oft und der Innenhof ist besonders an lauen Sommerabenden magisch.",
      timestamp: "vor 5 Tagen",
    },
    {
      id: "5",
      name: "Bonanza Coffee Roasters",
      isMustSee: false,
      review: "Ausgezeichneter Flat White im wunderschönen, ruhig gelegenen Hinterhof in Kreuzberg. Ein absolutes Muss für Kaffeeliebhaber.",
      timestamp: "vor 1 Woche",
    },
    {
      id: "6",
      name: "Klunkerkranich",
      isMustSee: true,
      review: "Bester Blick über die Dächer von Neukölln. Perfekt für einen Drink zum Sonnenuntergang, man sollte aber früh da sein.",
      timestamp: "vor 1 Woche",
    },
    {
      id: "7",
      name: "Voo Store",
      isMustSee: false,
      review: "Wunderschön gestalteter Concept Store im Hinterhof. Die Auswahl an Mode und Magazinen ist kuratiert und das kleine Café im Laden ist klasse.",
      timestamp: "vor 2 Wochen",
    },
    {
      id: "8",
      name: "Clärchens Ballhaus",
      isMustSee: false,
      review: "Ein Berliner Klassiker. Der Biergarten im vorderen Hof hat eine wunderbare Atmosphäre für ein spätes Abendessen oder ein kühles Getränk.",
      timestamp: "vor 3 Wochen",
    },
    {
      id: "9",
      name: "Do You Read Me?!",
      isMustSee: true,
      review: "Die beste Auswahl an internationalen Magazinen, Kunstbüchern und Indie-Publikationen in Mitte. Man findet immer etwas Inspirierendes.",
      timestamp: "vor 1 Monat",
    },
    {
      id: "10",
      name: "Insel der Jugend",
      isMustSee: false,
      review: "Ein kleiner Rückzugsort mitten in der Spree. Ideal, um ein Tretboot zu leihen oder einfach mit Freunden auf der Wiese am Wasser zu entspannen.",
      timestamp: "vor 1 Monat",
    },
    {
      id: "11",
      name: "Zola",
      isMustSee: true,
      review: "Hervorragende neapolitanische Pizza direkt am Landwehrkanal. Der Teig ist perfekt fluffig und die Zutaten sind super frisch.",
      timestamp: "vor 2 Monaten",
    },
    {
      id: "12",
      name: "Coda Dessert Bar",
      isMustSee: false,
      review: "Ein ganz besonderes kulinarisches Erlebnis. Dessert-Konzepte auf Sterneniveau, perfekt kombiniert mit perfekt abgestimmten Drinks.",
      timestamp: "vor 3 Monaten",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20 font-sans">
      {/* Header */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-100 bg-white px-4">
        <h1 className="text-lg font-bold text-slate-900">Mein Profil</h1>
        <div className="flex items-center gap-2">
          <form action={signout}>
            <button type="submit" className="flex h-8 items-center justify-center gap-1.5 rounded-lg text-slate-500 hover:bg-slate-50 active:scale-95 transition-all px-3 cursor-pointer">
              <LogOut className="h-4 w-4" />
              <span className="text-xs font-medium">Abmelden</span>
            </button>
          </form>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 active:scale-95 transition-all">
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex-grow overflow-y-auto px-4 pt-6 page-transition">
        {/* Profile Card Info */}
        <div className="flex flex-col items-center text-center">
          {/* Avatar Placeholder */}
          <div className="relative">
            <div className="flex h-22 w-22 items-center justify-center rounded-full bg-gradient-to-tr from-brand-green-800 to-brand-green-500 p-0.5 shadow-md">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-slate-800 font-bold text-2xl">
                    {user?.name ? user.name.split(' ').map(n => n[0]).slice(0,2).join('') : (user?.username ? user.username.slice(0,2).toUpperCase() : '')}
                  </div>
            </div>
          </div>

          <h2 className="mt-4 text-lg font-bold text-slate-950">{user?.name ?? user?.email ?? 'Profil'}</h2>
          <p className="text-xs font-semibold text-brand-green-700 mt-0.5">{user?.username ? `@${user.username}` : ''}</p>

          {/* Stats Bar */}
          <div className="mt-6 flex w-full max-w-[280px] divide-x divide-slate-100 rounded-xl border border-slate-100 bg-white py-3 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
            <div className="flex flex-1 flex-col items-center justify-center">
              <span className="text-base font-extrabold text-slate-900">12</span>
              <span className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">Empfehlungen</span>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center">
              <span className="text-base font-extrabold text-slate-900">{friendsCount}</span>
              <span className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">Freunde</span>
            </div>
          </div>

          {/* Add Friends Button */}
          <Link
            href="/profile/friends"
            className="mt-4 flex items-center justify-center gap-1.5 w-full max-w-[280px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-700 py-2.5 text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="h-4 w-4 text-brand-green-700" />
            Freunde hinzufügen
          </Link>
        </div>

        {/* Activity Feed Section */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Meine Empfehlungen
            </h3>
          </div>

          {/* Places List */}
          <div className="space-y-3.5 pb-8">
            {places.map((place) => (
              <div
                key={place.id}
                className="group rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all duration-300"
              >
                {/* Place Info Title & Tag */}
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-brand-green-700 transition-colors">
                      {place.name}
                    </h4>
                    {place.isMustSee && (
                      <div className="mt-1.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-600/15 shadow-sm">
                          <Sparkles className="h-3 w-3 text-amber-500 fill-amber-400 animate-pulse" />
                          Must See
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">{place.timestamp}</span>
                </div>

                {/* Place Review Text */}
                <p className="mt-3 text-xs leading-relaxed text-slate-600">
                  {place.review}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
