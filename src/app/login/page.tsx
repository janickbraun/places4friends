import LoginForm from "@/components/LoginForm";
import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anmelden",
  description: "Melde dich bei places4friends an, um deine Karte zu sehen und Empfehlungen mit Freunden zu teilen.",
};

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-center border-b border-slate-100 bg-white px-4">
        <h1 className="text-lg font-bold text-slate-900">Anmelden</h1>
      </header>

      <div className="flex-grow overflow-y-auto px-5 pt-8 page-transition">
        {/* App Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-green-500 to-brand-green-700 text-white shadow-lg shadow-brand-green-500/20 mb-4">
            <MapPin className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            places4friends
          </h2>
          <p className="mt-1.5 text-xs text-slate-500 max-w-[260px]">
            Melde dich an, um Orte zu empfehlen und dein Profil zu verwalten.
          </p>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-xs text-slate-500">
          Noch kein Konto?{" "}
          <Link
            href="/register"
            className="text-brand-green-700 font-semibold hover:underline"
          >
            Jetzt registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}
