import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Flag, LifeBuoy, Mail } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Hilfe und Kontakt zu places4friends: Konto löschen, Daten exportieren, Inhalte melden und Nutzer blockieren.",
};

const SUPPORT_EMAIL = "mail@janickbraun.com";

/**
 * Public support page. Linked as the "Support-URL" from the App Store and
 * Google Play listings, so it must stay reachable without a login — reviewers
 * and users open it straight from the store entry.
 */
const FAQ: { question: string; answer: ReactNode }[] = [
  {
    question: "Wie lösche ich mein Konto?",
    answer: (
      <>
        In der App unter{" "}
        <span className="font-semibold text-slate-800">
          Profil → Einstellungen → Daten &amp; Privatsphäre → Konto löschen
        </span>
        . Dein Profil, deine Empfehlungen, Kommentare und Freundschaften werden dabei unwiderruflich gelöscht.
      </>
    ),
  },
  {
    question: "Wie exportiere ich meine Daten?",
    answer: (
      <>
        Im selben Bereich (
        <span className="font-semibold text-slate-800">Profil → Einstellungen → Daten &amp; Privatsphäre</span>) kannst
        du eine Kopie deiner Daten herunterladen.
      </>
    ),
  },
  {
    question: "Wie melde ich eine Empfehlung?",
    answer: (
      <>
        Tippe auf das Menü (drei Punkte) an der jeweiligen Empfehlung und wähle{" "}
        <span className="font-semibold text-slate-800">Melden</span>. Jede Meldung wird geprüft; Inhalte, die gegen
        unsere Nutzungsbedingungen verstoßen, werden entfernt.
      </>
    ),
  },
  {
    question: "Wie blockiere ich einen Nutzer?",
    answer: (
      <>
        Über das Profil des Nutzers oder deine Freundesliste mit{" "}
        <span className="font-semibold text-slate-800">Blockieren</span>. Eine bestehende Freundschaft oder Anfrage wird
        dabei aufgelöst und ihr seht die Inhalte des jeweils anderen nicht mehr. Rückgängig machen kannst du das unter{" "}
        <span className="font-semibold text-slate-800">Einstellungen → Blockierte Nutzer</span>.
      </>
    ),
  },
  {
    question: "Ich habe mein Passwort vergessen.",
    answer: (
      <>
        Tippe auf der Anmeldeseite auf{" "}
        <span className="font-semibold text-slate-800">Passwort vergessen</span> – du bekommst dann einen Link zum
        Zurücksetzen per E-Mail.
      </>
    ),
  },
  {
    question: "Die Bestätigungs-E-Mail ist nicht angekommen.",
    answer: (
      <>
        Schau bitte zuerst in deinem Spam-Ordner nach. Du kannst die E-Mail in der App erneut anfordern – falls es
        weiterhin nicht klappt, schreib uns einfach.
      </>
    ),
  },
];

export default function SupportPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50/50 pb-20 font-sans">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-center border-b border-slate-100 bg-white px-4">
        <Link
          href="/profile"
          className="absolute left-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
          aria-label="Zurück"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-sm font-bold text-slate-900">Support</h1>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 text-sm leading-relaxed text-slate-700">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          <LifeBuoy className="h-8 w-8 text-brand-green-700 shrink-0" />
          <div>
            <h2 className="font-bold text-slate-800">Hilfe &amp; Kontakt</h2>
            <p className="text-xs text-slate-500">Wir helfen dir gerne weiter</p>
          </div>
        </div>

        <section className="space-y-3">
          <h3 className="text-base font-bold text-slate-900">Kontakt</h3>
          <p>
            Du hast eine Frage, einen Fehler gefunden oder brauchst Hilfe mit deinem Konto? Schreib uns – wir antworten
            in der Regel innerhalb von 2–3 Werktagen.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Support-Anfrage places4friends")}`}
            className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all hover:border-brand-green-200 active:scale-[0.99]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-green-50 text-brand-green-700 shrink-0">
              <Mail className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-xs text-slate-500">E-Mail</span>
              <span className="block font-semibold text-brand-green-700">{SUPPORT_EMAIL}</span>
            </span>
          </a>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-bold text-slate-900">Häufige Fragen</h3>
          <div className="space-y-3">
            {FAQ.map(({ question, answer }) => (
              <div
                key={question}
                className="space-y-1.5 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.03)]"
              >
                <h4 className="font-semibold text-slate-900">{question}</h4>
                <p className="text-slate-600">{answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">Missbrauch melden</h3>
          <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
            <Flag className="mt-0.5 h-5 w-5 text-brand-green-700 shrink-0" />
            <p className="text-slate-600">
              Anstößige Inhalte oder Nutzer meldest du am schnellsten direkt in der App (siehe oben). Dringende Fälle
              kannst du uns auch per E-Mail an{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-brand-green-700 hover:underline">
                {SUPPORT_EMAIL}
              </a>{" "}
              schicken – bitte nenne dabei die betroffene Empfehlung oder den Nutzernamen.
            </p>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">Rechtliches</h3>
          <p>
            Anbieterangaben findest du im{" "}
            <Link href="/impressum" className="text-brand-green-700 hover:underline">
              Impressum
            </Link>
            , Informationen zur Datenverarbeitung in der{" "}
            <Link href="/datenschutz" className="text-brand-green-700 hover:underline">
              Datenschutzerklärung
            </Link>{" "}
            und die Regeln zur Nutzung in den{" "}
            <Link href="/agb" className="text-brand-green-700 hover:underline">
              Nutzungsbedingungen
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
