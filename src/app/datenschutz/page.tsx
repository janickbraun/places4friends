import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export default function DatenschutzPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50/50 pb-20 font-sans">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-slate-100 bg-white px-4">
        <Link
          href="/profile"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
          aria-label="Zurück"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Datenschutzerklärung</h1>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 text-sm leading-relaxed text-slate-700">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          <Shield className="h-8 w-8 text-brand-green-700 shrink-0" />
          <div>
            <h2 className="font-bold text-slate-800">Datenschutz bei places4friends</h2>
            <p className="text-xs text-slate-500">Zuletzt aktualisiert: Mai 2026</p>
          </div>
        </div>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">1. Allgemeine Hinweise</h3>
          <p>
            Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten
            passiert, wenn Sie diese Anwendung besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie
            persönlich identifiziert werden können.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">2. Datenerfassung in dieser Anwendung</h3>
          <p className="font-semibold text-slate-800">Wer ist verantwortlich für die Datenerfassung?</p>
          <p>
            Die Datenverarbeitung in dieser Anwendung erfolgt durch den Betreiber. Die Kontaktdaten können Sie
            dem Impressum dieser Anwendung entnehmen.
          </p>
          <p className="font-semibold text-slate-800">Wie erfassen wir Ihre Daten?</p>
          <p>
            Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z. B. um
            Registrierungsdaten (Name, E-Mail-Adresse) oder von Ihnen erstellte Empfehlungen (Orte, Fotos, Beschreibungen)
            handeln.
          </p>
          <p>
            Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Anwendung durch unsere IT-Systeme
            erfasst. Das sind vor allem technische Daten (z. B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs).
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">3. Mapbox & Standortdaten</h3>
          <p>
            Diese Anwendung nutzt Mapbox zur Darstellung von interaktiven Karten. Um die Funktionen der Karte nutzen zu
            können, ist es notwendig, Ihre IP-Adresse und ggf. Standortdaten an Mapbox zu übertragen. Die Nutzung erfolgt
            auf Grundlage unseres berechtigten Interesses an einer ansprechenden Darstellung unserer Online-Angebote.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">4. Supabase & Speicherung</h3>
          <p>
            Unsere Datenbanken und Authentifizierungsdienste werden von Supabase bereitgestellt. Die von Ihnen
            eingegebenen Profildaten, Freundschaftsbeziehungen und Empfehlungen werden sicher auf den Servern von Supabase
            gespeichert und verarbeitet.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">5. Ihre Rechte</h3>
          <p>
            Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten
            personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung oder Löschung dieser
            Daten zu verlangen.
          </p>
        </section>
      </div>
    </div>
  );
}
