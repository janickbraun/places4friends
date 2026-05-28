"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Plus, User } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const isTabActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  const getTabClass = (path: string) => {
    const active = isTabActive(path);
    return `flex flex-col items-center justify-center gap-1 w-20 py-2 rounded-xl transition-all duration-200 ${
      active
        ? "text-brand-green-600 font-bold scale-105"
        : "text-slate-400 hover:text-slate-600 active:scale-95"
    }`;
  };

  return (
    <nav className="absolute bottom-0 left-0 right-0 z-50 w-full border-t border-slate-100 bg-white/90 pb-safe-bottom shadow-[0_-4px_24px_rgba(0,0,0,0.04)] backdrop-blur-md">
      <div className="flex h-16 items-center justify-around px-4">
        {/* Map Tab */}
        <Link href="/" className={getTabClass("/")}>
          <MapPin className={`h-5 w-5 transition-all duration-200 ${isTabActive("/") ? "stroke-[2.6]" : "stroke-[2]"}`} />
          <span className="text-[10px] tracking-wide">Karte</span>
        </Link>

        {/* Create / Recommend Tab */}
        <Link href="/create" className={getTabClass("/create")}>
          <Plus className={`h-5 w-5 transition-all duration-200 ${isTabActive("/create") ? "stroke-[2.8]" : "stroke-[2]"}`} />
          <span className="text-[10px] tracking-wide">Empfehlen</span>
        </Link>

        {/* Profile Tab */}
        <Link href="/profile" className={getTabClass("/profile")}>
          <User className={`h-5 w-5 transition-all duration-200 ${isTabActive("/profile") ? "stroke-[2.6]" : "stroke-[2]"}`} />
          <span className="text-[10px] tracking-wide">Profil</span>
        </Link>
      </div>
    </nav>
  );
}
