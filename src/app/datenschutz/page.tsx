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
            <p className="text-xs text-slate-500">Stand: Juni 2026</p>
          </div>
        </div>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">1. Allgemeine Hinweise</h3>
          <p>
            Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten
            passiert, wenn Sie diese App besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich
            identifiziert werden können.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">2. Verantwortliche Stelle</h3>
          <p>Die verantwortliche Stelle für die Datenverarbeitung in dieser App ist:</p>
          <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm text-xs space-y-1">
            <p className="font-semibold text-slate-800">Janick Braun</p>
            <p>Krottenkopfstr. 24a</p>
            <p>82377 Penzberg</p>
            <p>Telefon: +49 (0) 160 98640952</p>
            <p>
              E-Mail:{" "}
              <a href="mailto:mail@janickbraun.com" className="text-brand-green-700 hover:underline">
                mail@janickbraun.com
              </a>
            </p>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">3. Datenerfassung in dieser App</h3>

          <h4 className="font-semibold text-slate-800">Registrierung und Profil</h4>
          <p>
            Bei der Registrierung verarbeiten wir Ihre E-Mail-Adresse, Ihren Namen (sofern angegeben), Ihren Benutzernamen
            sowie Ihr Profilbild. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
          </p>

          <h4 className="font-semibold text-slate-800">Empfehlungen und Aktivitäten</h4>
          <p>
            Wenn Sie einen Ort empfehlen, werden Ortsbezeichnung, geografische Koordinaten, Bewertung, Beschreibung,
            Kategorien und optional Bilder erfasst und mit Ihrem Profil verknüpft. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b
            DSGVO.
          </p>

          <h4 className="font-semibold text-slate-800">Freundschaftsbeziehungen und Interaktionen</h4>
          <p>
            Die App verarbeitet Freundschaftsanfragen, angenommene Freundschaften, Kommentare zu Aktivitäten sowie Ihre
            Merkliste. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
          </p>

          <h4 className="font-semibold text-slate-800">Freundeseinladungen</h4>
          <p>
            Wenn Sie einen Einladungslink teilen, speichern wir einen eindeutigen Token, Ihre Nutzer-ID als Ersteller,
            die Anzahl der Nutzungen sowie ein Ablaufdatum. Diese Daten dienen der sicheren Freundschaftsverknüpfung
            (Art. 6 Abs. 1 lit. b DSGVO).
          </p>

          <h4 className="font-semibold text-slate-800">Hochgeladene Medien (Supabase Storage)</h4>
          <p>
            Profilbilder werden im Speicherbereich „avatars“, Aktivitätsfotos im Bereich „activity-images“ abgelegt. Die
            Dateien sind über öffentliche URLs abrufbar, sofern der Link bekannt ist. Rechtsgrundlage ist Art. 6 Abs. 1 lit.
            b DSGVO.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">4. Drittanbieter und Infrastruktur</h3>

          <h4 className="font-semibold text-slate-800">Vercel (Hosting)</h4>
          <p>
            Diese App wird bei Vercel Inc. gehostet. Dabei werden technisch notwendige Server-Logdaten (z. B. IP-Adresse,
            Zeitpunkt des Zugriffs, angeforderte URL) verarbeitet. Für die ungefähre Standortbestimmung nutzen wir, soweit
            verfügbar, von Vercel bereitgestellte Geo-Header (z. B. x-vercel-ip-latitude). Rechtsgrundlage ist Art. 6 Abs. 1
            lit. f DSGVO (berechtigtes Interesse an sicherem Betrieb). Mit Vercel besteht ein Vertrag zur Auftragsverarbeitung
            gemäß Art. 28 DSGVO.
          </p>

          <h4 className="font-semibold text-slate-800">Supabase (Backend, Datenbank und Authentifizierung)</h4>
          <p>
            Registrierungsdaten, Profildetails und Inhalte werden bei Supabase Inc. gespeichert. Wir streben die Nutzung von
            Serverstandorten in der EU an. Mit Supabase besteht ein AVV gemäß Art. 28 DSGVO.
          </p>

          <h4 className="font-semibold text-slate-800">Mapbox (Kartenvisualisierung)</h4>
          <p>
            Zur Darstellung interaktiver Karten wird die API von Mapbox Inc. genutzt. Dabei wird Ihre IP-Adresse an Mapbox
            übermittelt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Mit Mapbox besteht ein AVV gemäß Art. 28 DSGVO.
          </p>

          <h4 className="font-semibold text-slate-800">Google Places API (Ortssuche)</h4>
          <p>
            Zur Suche nach Orten und Points of Interest nutzen wir serverseitig die Google Places API (Google Ireland Limited
            bzw. Google LLC). Dabei können Suchbegriffe und Koordinaten an Google übermittelt werden. Die Verarbeitung erfolgt
            ausschließlich auf unseren Servern; der API-Schlüssel wird nicht im Browser ausgeliefert. Rechtsgrundlage ist Art.
            6 Abs. 1 lit. b DSGVO (Bereitstellung der Suchfunktion) bzw. Art. 6 Abs. 1 lit. f DSGVO. Mit Google besteht ein
            AVV gemäß Art. 28 DSGVO, soweit erforderlich.
          </p>

          <h4 className="font-semibold text-slate-800">Ungefährer Standort beim Kartenstart</h4>
          <p>
            Für Gäste ohne GPS-Einwilligung leiten wir aus der IP-Adresse einen ungefähren Standort ab. Primär nutzen wir
            Geo-Informationen aus dem Hosting (Vercel). Als Fallback kann ipapi.co (Kloudend Inc.) eingesetzt werden. Die
            IP-Adresse wird nicht dauerhaft in der Datenbank gespeichert; im Arbeitsspeicher unseres Servers wird sie für
            maximal eine Stunde als Hash-Wert zwischengespeichert. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.
          </p>

          <h4 className="font-semibold text-slate-800">Standortzugriff im Browser (GPS)</h4>
          <p>
            Einen genauen Standort verarbeiten wir nur, wenn Sie dies in Ihrem Browser erlauben. Rechtsgrundlage ist Ihre
            Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), widerrufbar in den Browser-Einstellungen.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">5. Cookies und lokale Speicherung</h3>
          <p>
            Wir setzen technisch notwendige Session-Cookies ein (Supabase-Authentifizierung), um Sie angemeldet zu halten.
            Darüber hinaus speichern wir in Ihrem Browser lokal (localStorage bzw. sessionStorage) unter anderem:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>Ihre bevorzugte Kartenansicht (mapStyle)</li>
            <li>den zuletzt gewählten Kartenausschnitt (p4f_map_viewport_…)</li>
            <li>den zuletzt bekannten Standort in der Sitzung (p4f_last_geo)</li>
            <li>den Fortschritt der Einführungstour (p4f_onboarding_…)</li>
            <li>ob Sie den Hinweis zu Cookies und lokaler Speicherung geschlossen haben</li>
          </ul>
          <p>
            Diese Speicherungen dienen der Funktionsfähigkeit und Nutzerfreundlichkeit. Es werden keine Marketing- oder
            Analyse-Cookies eingesetzt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO bzw. bei GPS Art. 6 Abs. 1 lit. a DSGVO.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">6. Speicherdauer</h3>
          <p>
            Personenbezogene Daten speichern wir, solange Ihr Konto besteht. Nach Löschung Ihres Kontos werden Ihre Daten
            gelöscht, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen. IP-basierte Zwischenwerte im
            Server-Arbeitsspeicher werden nach höchstens einer Stunde verworfen. Einladungslinks verfallen nach Ablauf der
            jeweiligen Gültigkeitsdauer.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">7. Drittlandübermittlung</h3>
          <p>
            Einige der genannten Anbieter (z. B. Mapbox, Google, Supabase, Vercel, ipapi.co) haben ihren Sitz in den USA
            oder verarbeiten Daten auch dort. Für Übermittlungen in Drittländer setzen wir geeignete Garantien ein, insbesondere
            Standardvertragsklauseln der EU-Kommission (Art. 46 DSGVO), und schließen mit Auftragsverarbeitern Verträge gemäß
            Art. 28 DSGVO ab.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">8. Ihre Rechte</h3>
          <p>Sie haben im Rahmen der DSGVO folgende Rechte:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>Auskunft (Art. 15 DSGVO)</li>
            <li>Berichtigung (Art. 16 DSGVO)</li>
            <li>Löschung (Art. 17 DSGVO)</li>
            <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Widerspruch (Art. 21 DSGVO)</li>
            <li>Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)</li>
          </ul>
          <p className="mt-2">
            <strong>In der App:</strong> Unter Profil → Einstellungen können Sie Ihre Daten in den Bereichen „Deine Daten“
            als JSON-Datei exportieren und Ihr Konto in der Gefahrenzone unwiderruflich löschen. Profildaten können Sie dort
            ebenfalls bearbeiten.
          </p>
          <p>
            Für weitere Anfragen (z. B. Auskunft oder Widerspruch) wenden Sie sich an{" "}
            <a href="mailto:mail@janickbraun.com" className="text-brand-green-700 hover:underline">
              mail@janickbraun.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
