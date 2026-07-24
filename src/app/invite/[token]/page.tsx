import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AlertTriangle, Clock, Smartphone, UserPlus, XCircle, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isValidInviteToken } from "@/lib/validation";
import LegalFooter from "@/components/LegalFooter";

export const metadata: Metadata = {
  title: "Einladung",
  description: "Nimm deine Einladung zu places4friends an.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Landing page for `/invite/<token>` — the link the app and the website hand
 * out. It is also the only path claimed as an iOS universal link / Android app
 * link, so on a phone with the app installed the OS opens the app instead and
 * this page never renders. Claiming `/profile/*` instead would have swallowed
 * the `/profile/settings` and `/profile/friends` pages.
 *
 * Signed in  -> straight to the inviter's profile, which shows the accept card.
 * Signed out -> sign-in/up carrying `?next=`, so the invite is no longer lost
 *               the moment an unauthenticated visitor opens the link.
 */

type Failure = "not_found" | "expired" | "max_uses";

const FAILURES: Record<Failure, { icon: LucideIcon; title: string; message: string }> = {
  not_found: {
    icon: XCircle,
    title: "Einladung ungültig",
    message: "Dieser Einladungslink ist ungültig oder wurde zurückgezogen.",
  },
  expired: {
    icon: Clock,
    title: "Einladung abgelaufen",
    message:
      "Dieser Einladungslink ist abgelaufen. Bitte deinen Freund oder deine Freundin um einen neuen Link.",
  },
  max_uses: {
    icon: AlertTriangle,
    title: "Einladung aufgebraucht",
    message:
      "Dieser Einladungslink wurde bereits zu oft verwendet. Bitte deinen Freund oder deine Freundin um einen neuen Link.",
  },
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!isValidInviteToken(token)) {
    return <InviteFailure failure="not_found" />;
  }

  // Validating needs the service role, so it goes through the admin client —
  // same as /api/friendships/invite/validate. This is read-only: a use is only
  // consumed later, by accept_friend_invite on the profile page.
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return <InviteFailure failure="not_found" />;
  }

  const { data, error } = await supabaseAdmin.rpc("validate_friend_invite_link", {
    p_token: token,
  });

  if (error) {
    console.error("Error validating friend invite link:", error);
    return <InviteFailure failure="not_found" />;
  }

  const result = data as { valid?: boolean; error?: string; creator_id?: string };

  if (!result?.valid || !result.creator_id) {
    const failure = (result?.error ?? "not_found") as Failure;
    return <InviteFailure failure={failure in FAILURES ? failure : "not_found"} />;
  }

  const target = `/profile/${result.creator_id}?invite=${encodeURIComponent(token)}`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(target);
  }

  return <InviteSignedOut target={target} token={token} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20 font-sans">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-center border-b border-slate-100 bg-white px-4">
        <h1 className="text-lg font-bold text-slate-900">Einladung</h1>
      </header>
      <div className="flex flex-grow flex-col items-center px-5 pt-12 page-transition">
        {children}
      </div>
      <LegalFooter />
    </div>
  );
}

function InviteSignedOut({ target, token }: { target: string; token: string }) {
  const next = encodeURIComponent(target);
  return (
    <Shell>
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-green-100">
        <UserPlus className="h-8 w-8 text-brand-green-700" />
      </div>
      <h2 className="text-lg font-bold text-slate-900">Du wurdest eingeladen</h2>
      <p className="mt-2 max-w-[300px] text-center text-xs leading-relaxed text-slate-500">
        Erstelle ein Konto oder melde dich an, um die Einladung anzunehmen. Danach seht ihr eure
        Lieblingsorte gegenseitig auf der Karte.
      </p>

      <div className="mt-8 flex w-full max-w-[300px] flex-col gap-3">
        <Link
          href={`/register?next=${next}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green-700 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-green-500/20"
        >
          <UserPlus className="h-4 w-4" />
          Konto erstellen
        </Link>
        <Link
          href={`/login?next=${next}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 shadow-sm"
        >
          Anmelden
        </Link>
        {/* Escape hatch when the app is installed but the universal link was
            opened in the browser anyway (e.g. the user picked "in Browser
            öffnen" once, which iOS then remembers). */}
        <a
          href={`places4friendsmobileapp://invite/${encodeURIComponent(token)}`}
          className="flex items-center justify-center gap-1.5 py-1 text-xs font-medium text-slate-400"
        >
          <Smartphone className="h-3.5 w-3.5" />
          App bereits installiert? In der App öffnen
        </a>
      </div>
    </Shell>
  );
}

function InviteFailure({ failure }: { failure: Failure }) {
  const { icon: Icon, title, message } = FAILURES[failure];
  return (
    <Shell>
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
        <Icon className="h-8 w-8 text-amber-700" />
      </div>
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-[300px] text-center text-xs leading-relaxed text-slate-500">
        {message}
      </p>
      <Link
        href="/"
        className="mt-8 w-full max-w-[300px] rounded-xl bg-brand-green-700 px-4 py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-brand-green-500/20"
      >
        Zur Karte
      </Link>
    </Shell>
  );
}
