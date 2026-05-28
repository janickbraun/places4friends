import Link from "next/link";
import { LogIn, UserPlus, MapPin } from "lucide-react";

export default function AuthPrompt({ context }: { context: "profile" | "create" }) {
  const messages = {
    profile: {
      title: "Dein Profil",
      description:
        "Melde dich an oder erstelle ein Konto, um dein Profil zu sehen, Orte zu speichern und mit Freunden zu teilen.",
    },
    create: {
      title: "Ort empfehlen",
      description:
        "Melde dich an oder erstelle ein Konto, um Orte zu empfehlen und auf der Karte mit deinen Freunden zu teilen.",
    },
  };

  const { title, description } = messages[context];

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center page-transition">
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-green-100 to-brand-green-200 text-brand-green-700 mb-5">
        <MapPin className="h-8 w-8" />
      </div>

      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-2 text-xs text-slate-500 max-w-[280px] leading-relaxed">
        {description}
      </p>

      {/* Buttons */}
      <div className="mt-8 w-full max-w-[280px] space-y-3">
        <Link
          href="/login"
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-green-700 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-green-900/10 transition-all hover:bg-brand-green-800 active:scale-[0.98]"
        >
          <LogIn className="h-4 w-4" />
          Anmelden
        </Link>
        <Link
          href="/register"
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98]"
        >
          <UserPlus className="h-4 w-4" />
          Konto erstellen
        </Link>
      </div>
    </div>
  );
}
