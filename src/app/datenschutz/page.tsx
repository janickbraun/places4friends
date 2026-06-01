import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description: "Informationen zum Datenschutz und zur Verarbeitung personenbezogener Daten bei places4friends.",
};

export default function DatenschutzPage() {
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
        <h1 className="text-sm font-bold text-slate-900">Datenschutzerklärung</h1>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 text-sm leading-relaxed text-slate-700">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          <Shield className="h-8 w-8 text-brand-green-700 shrink-0" />
          <div>
            <h2 className="font-bold text-slate-800">Datenschutz bei places4friends</h2>
            <p className="text-xs text-slate-500">Stand: Mai 2026</p>
          </div>
        </div>

        {/* 1. Allgemeine Hinweise */}
        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">1. Allgemeine Hinweise</h3>
          <p>
            Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten
            passiert, wenn Sie diese App besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich
            identifiziert werden können. Ausführliche Informationen zum Thema Datenschutz entnehmen Sie unserer unter diesem
            Text aufgeführten Datenschutzerklärung.
          </p>
        </section>

        {/* 2. Verantwortliche Stelle */}
        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">2. Hinweis zur Verantwortlichen Stelle</h3>
          <p>Die verantwortliche Stelle für die Datenverarbeitung in dieser App ist:</p>
          <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm text-xs space-y-1">
            <p className="font-semibold text-slate-800">Janick Braun</p>
            <p>Ruhe am Bach 5d</p>
            <p>82377 Penzberg</p>
            <p>Telefon: +49 (0) 160 98640952</p>
            <p>
              E-Mail:{" "}
              <a href="mailto:janick@secondskate.de" className="text-brand-green-700 hover:underline">
                janick@secondskate.de
              </a>
            </p>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Verantwortliche Stelle ist die natürliche oder juristische Person, die allein oder gemeinsam mit anderen über die
            Zwecke und Mittel der Verarbeitung von personenbezogenen Daten (z. B. Namen, E-Mail-Adressen o. Ä.) entscheidet.
          </p>
        </section>

        {/* 3. Datenerfassung & Verarbeitungszwecke */}
        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">3. Datenerfassung in dieser App</h3>
          
          <h4 className="font-semibold text-slate-800">Registrierung und Profil</h4>
          <p>
            Wenn Sie sich in der App registrieren, verarbeiten wir Ihre E-Mail-Adresse, Ihren Namen (sofern angegeben), Ihren
            Benutzernamen sowie Ihr Profilbild. Diese Daten dienen zur Bereitstellung der Kernfunktionen (Teilen von
            Empfehlungen mit Freunden, Zuweisung Ihrer Beiträge, Anzeige in Profilen). Die Rechtsgrundlage für diese
            Verarbeitung ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
          </p>

          <h4 className="font-semibold text-slate-800">Empfehlungen und Aktivitäten</h4>
          <p>
            Wenn Sie einen Ort in der App empfehlen, werden die Ortsbezeichnung, die geografischen Koordinaten (Breitengrad,
            Längengrad), Ihre Bewertung, Beschreibung, ausgewählte Kategorien und optional hochgeladene Bilder erfasst.
            Diese Inhalte werden mit Ihrem Profil verknüpft und auf der geteilten Karte Ihren Freunden angezeigt.
            Rechtsgrundlage ist die Erfüllung unseres Vertrages zur Bereitstellung dieses sozialen Dienstes (Art. 6 Abs. 1 lit.
            b DSGVO).
          </p>

          <h4 className="font-semibold text-slate-800">Freundschaftsbeziehungen und Interaktionen</h4>
          <p>
            Die App verarbeitet Verbindungen zu anderen Nutzern (Freundschaftsanfragen, angenommene Freundschaften), Kommentare
            zu Aktivitäten sowie Ihre Merkliste (Wishlist). Diese Verarbeitungen sind notwendig, um die soziale Interaktion
            innerhalb der App zu ermöglichen (Art. 6 Abs. 1 lit. b DSGVO).
          </p>
        </section>

        {/* 4. Drittanbieter & Technische Infrastruktur */}
        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">4. Drittanbieter & Infrastruktur</h3>

          <h4 className="font-semibold text-slate-800">Supabase (Backend, Datenbank & Authentifizierung)</h4>
          <p>
            Unsere App-Infrastruktur, Authentifizierungsdienste und Datenbanken werden von Supabase gehostet (Supabase Inc.).
            Ihre Registrierungsdaten, Profildetails und alle erstellten Inhalte werden auf Servern von Supabase gespeichert.
            Wir haben mit Supabase einen Vertrag zur Auftragsverarbeitung (AVV) gemäß Art. 28 DSGVO geschlossen, um den Schutz
            Ihrer Daten sicherzustellen.
          </p>

          <h4 className="font-semibold text-slate-800">Mapbox (Karten- und Standortvisualisierung)</h4>
          <p>
            Diese Anwendung verwendet zur Bereitstellung interaktiver Karten die API von Mapbox (Mapbox Inc.). Zur Darstellung der
            Karte ist es technisch erforderlich, dass Ihre IP-Adresse an Server von Mapbox übertragen wird. Die Nutzung von Mapbox
            erfolgt auf Grundlage unseres berechtigten Interesses an einer komfortablen und ansprechenden Visualisierung von
            Empfehlungsorten (Art. 6 Abs. 1 lit. f DSGVO).
          </p>

          <h4 className="font-semibold text-slate-800">Ungefährer Standort beim Kartenstart (Gäste)</h4>
          <p>
            Wenn Sie die App ohne Anmeldung nutzen und noch keinen Standortzugriff im Browser erlaubt haben, leiten wir aus Ihrer
            IP-Adresse einen ungefähren Standort (in der Regel auf Stadt- oder Regionsebene) ab, um die Karte sinnvoll zu zentrieren.
            Dazu wird Ihre IP-Adresse beim Aufruf unserer Server verarbeitet; eine dauerhafte Speicherung der IP-Adresse erfolgt
            nicht. Die abgeleiteten Koordinaten werden nur vorübergehend genutzt und nicht in Ihrem Profil gespeichert.
          </p>
          <p>
            Für die IP-basierte Standortschätzung können wir den Dienst ipapi.co (von Kloudend Inc.) einsetzen. Dabei wird Ihre
            IP-Adresse an diesen Anbieter übermittelt. Wir schließen mit Drittanbietern, die personenbezogene Daten in unserem Auftrag
            verarbeiten, Verträge zur Auftragsverarbeitung gemäß Art. 28 DSGVO ab, soweit dies erforderlich ist.
          </p>
          <p>
            Rechtsgrundlage ist unser berechtigtes Interesse an einer nutzerfreundlichen initialen Kartenansicht (Art. 6 Abs. 1 lit. f
            DSGVO). Einen genauen Standort (GPS) verarbeiten wir nur, wenn Sie dies ausdrücklich in Ihrem Browser erlauben.
          </p>

          <h4 className="font-semibold text-slate-800">Standortzugriff im Browser (GPS)</h4>
          <p>
            Wenn Sie in Ihrem Browser den Zugriff auf Ihren genauen Standort erlauben, nutzen wir diese Position, um die Karte auf
            Ihre Umgebung zu zentrieren und Ihren Standort auf der Karte anzuzeigen. Die Verarbeitung erfolgt lokal in Ihrem Browser;
            die Standortdaten werden nicht ohne Ihre weitere Nutzung der App an uns übermittelt, sofern Sie keinen Ort empfehlen oder
            anderweitig standortbezogene Inhalte erstellen. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die
            Sie jederzeit in den Browser-Einstellungen widerrufen können.
          </p>
        </section>

        {/* 5. Ihre Rechte */}
        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">5. Ihre Rechte</h3>
          <p>Sie haben im Rahmen der DSGVO jederzeit das Recht auf:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>Auskunft über Ihre bei uns gespeicherten personenbezogenen Daten (Art. 15 DSGVO)</li>
            <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
            <li>Löschung Ihrer bei uns gespeicherten Daten (Art. 17 DSGVO)</li>
            <li>Einschränkung der Datenverarbeitung (Art. 18 DSGVO)</li>
            <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
          </ul>
          <p className="mt-2">
            Zudem steht Ihnen ein Beschwerderecht bei einer zuständigen Datenschutz-Aufsichtsbehörde zu (Art. 77 DSGVO).
          </p>
        </section>
      </div>
    </div>
  );
}
