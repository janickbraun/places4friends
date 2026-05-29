"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type HintPlacement = "bottom-nav" | "top-right";

type StepDefinition = {
  id: string;
  title: string;
  description: string;
  bullets?: string[];
  action?: {
    label: string;
    href: string;
  };
  hint?: {
    text: string;
    placement: HintPlacement;
  };
};

const STEPS: StepDefinition[] = [
  {
    id: "welcome",
    title: "Willkommen bei places4friends",
    description:
      "Hier sammelst du Empfehlungen von Freunden und behältst besondere Orte auf einer gemeinsamen Karte im Blick.",
    bullets: [
      "Empfehlungen sind persönlich, keine anonymen Sterne.",
      "Highlights markieren Orte, die man wirklich sehen muss.",
    ],
  },
  {
    id: "friends",
    title: "Freunde hinzufügen",
    description:
      "Folge Freunden, damit ihre Empfehlungen auf deiner Karte und im Aktivitäten-Feed auftauchen.",
    bullets: [
      "Suche nach Namen oder Benutzernamen.",
      "Freundschaftsanfragen findest du im Freunde-Tab.",
    ],
    action: {
      label: "Freunde finden",
      href: "/profile/friends",
    },
    hint: {
      text: "Der Freunde-Tab ist hier unten.",
      placement: "bottom-nav",
    },
  },
  {
    id: "map",
    title: "Die Karte verstehen",
    description:
      "Die Karte ist dein Radar. Filtere Empfehlungen, entdecke Highlights und öffne Details direkt am Pin.",
    bullets: [
      "Mit Filtern findest du Highlights oder Kategorien.",
      "Das Ebenen-Menü wechselt den Kartenstil.",
      "Ein Tap auf den Pin öffnet Details und Kommentare.",
    ],
    hint: {
      text: "Filter und Ebenen findest du oben in der Karte.",
      placement: "top-right",
    },
  },
  {
    id: "pages",
    title: "Alle Bereiche im Blick",
    description:
      "Unten findest du die wichtigsten Bereiche. Jeder Tab hat einen klaren Fokus.",
    bullets: [
      "Karte: Empfehlungen im Kontext entdecken.",
      "Aktivitäten: Neueste Empfehlungen deiner Freunde.",
      "Empfehlen: Eigene Orte hinzufügen.",
      "Freunde: Kontakte verwalten und Anfragen senden.",
      "Profil: Eigene Empfehlungen und Merkliste.",
    ],
    hint: {
      text: "Die Navigation ist immer am unteren Rand.",
      placement: "bottom-nav",
    },
  },
];

type Step = StepDefinition;

export default function OnboardingOverlay() {
  const supabase = createClient();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  const storageKey = useMemo(() => {
    return userId ? `p4f_onboarding_step_${userId}` : "p4f_onboarding_step";
  }, [userId]);

  const activeStep: Step = STEPS[stepIndex] ?? STEPS[0];

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      const { data, error: userError } = await supabase.auth.getUser();
      if (!active) return;
      if (userError || !data.user) {
        setIsVisible(false);
        setIsReady(true);
        setUserId(null);
        return;
      }

      const onboardingCompleted = data.user.user_metadata?.onboarding_completed;
      setUserId(data.user.id);
      setIsVisible(onboardingCompleted !== true);
      setIsReady(true);
    };

    loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      active = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!isVisible || !isReady) return;
    const raw = globalThis.localStorage?.getItem(storageKey);
    const parsed = raw ? Number.parseInt(raw, 10) : 0;
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed < STEPS.length) {
      setStepIndex(parsed);
    }
  }, [isReady, isVisible, storageKey]);

  useEffect(() => {
    if (!isVisible || !isReady) return;
    globalThis.localStorage?.setItem(storageKey, String(stepIndex));
  }, [isReady, isVisible, stepIndex, storageKey]);

  if (!isReady || !isVisible) {
    return null;
  }

  const getHintPosition = (placement?: HintPlacement) => {
    if (placement === "bottom-nav") {
      return "bottom-20 left-1/2 -translate-x-1/2";
    }
    if (placement === "top-right") {
      return "top-24 right-6";
    }
    return "bottom-20 left-1/2 -translate-x-1/2";
  };

  const completeOnboarding = async () => {
    setIsUpdating(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({
      data: { onboarding_completed: true },
    });

    if (updateError) {
      setError("Onboarding konnte nicht abgeschlossen werden. Bitte erneut versuchen.");
      setIsUpdating(false);
      return;
    }

    globalThis.localStorage?.removeItem(storageKey);
    setIsUpdating(false);
    setIsVisible(false);
  };

  const handleNext = () => {
    if (stepIndex >= STEPS.length - 1) {
      completeOnboarding();
      return;
    }
    setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const handleAction = () => {
    if (!activeStep.action) return;
    router.push(activeStep.action.href);
  };

  return (
    <div className="fixed inset-0 z-[70] pointer-events-none">
      {activeStep.hint && (
        <div
          className={`fixed ${getHintPosition(activeStep.hint.placement)} pointer-events-none`}
        >
          <div className="relative rounded-2xl bg-white px-4 py-3 text-xs font-semibold text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.18)]">
            {activeStep.hint.text}
            <span className="absolute -bottom-2 left-6 h-4 w-4 rotate-45 rounded-[3px] bg-white shadow-[6px_6px_14px_rgba(15,23,42,0.12)]" />
          </div>
        </div>
      )}

      <div className="fixed right-4 top-20 w-[320px] max-w-[86vw] pointer-events-auto sm:right-8 sm:top-24">
        <div className="rounded-3xl border border-slate-200/80 bg-white/98 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
          <span>
            Schritt {stepIndex + 1} von {STEPS.length}
          </span>
          <button
            type="button"
            onClick={handleSkip}
            className="rounded-full px-3 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
            disabled={isUpdating}
          >
            Überspringen
          </button>
        </div>

        <h2 className="mt-3 text-xl font-bold text-slate-900">{activeStep.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{activeStep.description}</p>

        {activeStep.bullets && (
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {activeStep.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-green-600" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        )}

        {activeStep.action && (
          <button
            type="button"
            onClick={handleAction}
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-brand-green-200 bg-brand-green-50 px-4 py-3 text-sm font-semibold text-brand-green-700 transition hover:bg-brand-green-100"
          >
            {activeStep.action.label}
          </button>
        )}

        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={stepIndex === 0 || isUpdating}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            Zurück
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={isUpdating}
            className="flex-1 rounded-xl bg-brand-green-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-green-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {stepIndex >= STEPS.length - 1 ? "Los geht's" : "Weiter"}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
