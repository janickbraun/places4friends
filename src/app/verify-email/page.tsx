import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Home,
  XCircle,
  type LucideIcon,
} from "lucide-react";

type Status = "success" | "invalid" | "expired" | "error";

const RESULTS: Record<
  Status,
  { icon: LucideIcon; title: string; message: string; ok: boolean }
> = {
  success: {
    icon: CheckCircle2,
    title: "E-Mail bestätigt",
    message:
      "Deine E-Mail-Adresse wurde erfolgreich verifiziert. Du kannst jetzt zur App zurückkehren.",
    ok: true,
  },
  invalid: {
    icon: XCircle,
    title: "Link ungültig",
    message: "Dieser Verifizierungslink ist ungültig oder wurde bereits verwendet.",
    ok: false,
  },
  expired: {
    icon: Clock,
    title: "Link abgelaufen",
    message:
      "Dieser Verifizierungslink ist abgelaufen. Bitte fordere in der App einen neuen an.",
    ok: false,
  },
  error: {
    icon: AlertTriangle,
    title: "Verifizierung fehlgeschlagen",
    message:
      "Der Verifizierungsstatus konnte nicht aktualisiert werden. Bitte versuche es später erneut.",
    ok: false,
  },
};

export const metadata = {
  title: "E-Mail-Bestätigung",
};

/**
 * Public result page for the e-mail verification link sent by the mobile app.
 *
 * The token is validated by the `verify-email` Supabase Edge Function (it needs
 * the service role), which then redirects here with `?status=`. Supabase Edge
 * Functions cannot serve HTML — they rewrite `text/html` to `text/plain` — so
 * the presentation lives here. Must stay publicly reachable: the user opens
 * this straight from their inbox and is not signed in on the web.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const key: Status = status && status in RESULTS ? (status as Status) : "invalid";
  const { icon: Icon, title, message, ok } = RESULTS[key];

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] px-6 py-16 text-center page-transition">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-2xl mb-6 shadow-sm ${
          ok
            ? "bg-gradient-to-br from-brand-green-100 to-brand-green-200 text-brand-green-700 shadow-brand-green-500/10"
            : "bg-gradient-to-br from-red-100 to-red-200 text-red-700 shadow-red-500/10"
        }`}
      >
        <Icon className="h-8 w-8" />
      </div>

      <h1 className="text-xl font-bold text-slate-900">{title}</h1>

      <p className="mt-3 text-sm text-slate-500 max-w-[280px] leading-relaxed">
        {message}
      </p>

      <div className="mt-8 w-full max-w-[240px]">
        <Link
          href="/"
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-green-700 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-green-900/10 transition-all hover:bg-brand-green-800 active:scale-[0.98]"
        >
          <Home className="h-4 w-4" />
          Zurück zur Karte
        </Link>
      </div>
    </div>
  );
}
