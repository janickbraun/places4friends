import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nutzungsbedingungen",
  description: "Allgemeine Geschäftsbedingungen für die Nutzung von places4friends.",
};

export default function AgbPage() {
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
        <h1 className="text-sm font-bold text-slate-900">Nutzungsbedingungen</h1>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 text-sm leading-relaxed text-slate-700">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          <Scale className="h-8 w-8 text-brand-green-700 shrink-0" />
          <div>
            <h2 className="font-bold text-slate-800">Nutzungsbedingungen</h2>
            <p className="text-xs text-slate-500">Stand: Juni 2026</p>
          </div>
        </div>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">1. Geltungsbereich</h3>
          <p>
            Diese Nutzungsbedingungen regeln die Nutzung der Web-App places4friends (nachfolgend „App“). Betreiber ist
            Janick Braun, Krottenkopfstr. 24a, 82377 Penzberg (Angaben im{" "}
            <Link href="/impressum" className="text-brand-green-700 hover:underline">
              Impressum
            </Link>
            ). Mit der Registrierung oder Nutzung der App akzeptieren Sie diese Bedingungen.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">2. Leistungsbeschreibung</h3>
          <p>
            places4friends ist eine soziale Empfehlungs-App: Nutzer können Lieblingsorte auf einer interaktiven Karte teilen,
            mit Freunden vernetzen, Orte kommentieren und Merklisten pflegen. Der konkrete Funktionsumfang kann sich im
            Rahmen der Weiterentwicklung ändern.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">3. Registrierung und Konto</h3>
          <p>
            Für die volle Nutzung ist ein Nutzerkonto erforderlich. Sie müssen mindestens 16 Jahre alt sein. Sie sind für die
            Geheimhaltung Ihrer Zugangsdaten verantwortlich und verpflichtet, wahrheitsgemäße Angaben zu machen. Ein Konto pro
            Person ist erwünscht; missbräuchliche Mehrfachkonten können gesperrt werden.
          </p>
          <p>
            Informationen zur Verarbeitung personenbezogener Daten finden Sie in unserer{" "}
            <Link href="/datenschutz" className="text-brand-green-700 hover:underline">
              Datenschutzerklärung
            </Link>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">4. Nutzungspflichten</h3>
          <p>Sie verpflichten sich, die App nicht zu missbrauchen. Insbesondere ist untersagt:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>rechtswidrige, beleidigende, diskriminierende oder irreführende Inhalte zu veröffentlichen</li>
            <li>Rechte Dritter (z. B. Urheber-, Marken- oder Persönlichkeitsrechte) zu verletzen</li>
            <li>die technische Infrastruktur zu stören, auszuspähen oder unbefugt zuzugreifen</li>
            <li>automatisierte Abfragen (Scraping) ohne unsere Zustimmung durchzuführen</li>
            <li>die App für kommerzielle Werbung ohne vorherige Absprache zu nutzen</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">5. Nutzerinhalte (User-Generated Content)</h3>
          <p>
            Für von Ihnen eingestellte Inhalte (Texte, Bilder, Empfehlungen, Kommentare) sind Sie allein verantwortlich. Mit
            dem Einstellen räumen Sie uns ein einfaches, nicht ausschließliches, zeitlich auf die Dauer der Bereitstellung in
            der App beschränktes Nutzungsrecht ein, um diese Inhalte den von Ihnen gewählten Empfängern (z. B. Freunden) in der
            App anzuzeigen, zu speichern und technisch zu verarbeiten. Dieses Recht endet mit Löschung des Inhalts oder Ihres
            Kontos.
          </p>
          <p>
            Wir sind berechtigt, Inhalte zu entfernen oder Konten zu sperren, wenn ein begründeter Verdacht auf Verstöße gegen
            diese Bedingungen oder geltendes Recht besteht.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">6. Freundschaften und Einladungslinks</h3>
          <p>
            Freundschaftsverbindungen entstehen durch Anfragen oder über persönliche Einladungslinks. Einladungslinks sind
            persönlich und nicht zur öffentlichen Verbreitung in Massenmedien bestimmt. Sie haften für den missbräuchlichen
            Gebrauch von Links, die Sie teilen.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">7. Verfügbarkeit</h3>
          <p>
            Wir bemühen uns um eine hohe Verfügbarkeit, garantieren diese jedoch nicht. Wartung, Updates oder Störungen bei
            Drittanbietern (z. B. Hosting, Karten) können zu vorübergehenden Einschränkungen führen. Die App kann sich noch in
            aktiver Entwicklung befinden; Funktionen können sich ändern.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">8. Haftung und externe Dienste</h3>
          <p>
            Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Schäden aus der Verletzung von Leben,
            Körper oder Gesundheit. Im Übrigen haften wir nur bei Verletzung wesentlicher Vertragspflichten, beschränkt auf den
            vorhersehbaren, vertragstypischen Schaden. Die vorstehende Haftungsbeschränkung gilt nicht, soweit zwingende
            gesetzliche Vorschriften entgegenstehen.
          </p>
          <p>
            Die App bindet Dienste Dritter ein (z. B. Mapbox für Karten, Google für Ortssuche, Google Maps für Wegbeschreibungen).
            Für Inhalte und Verfügbarkeit externer Dienste sind deren Betreiber verantwortlich. Links zu externen Websites
            erfolgen auf eigenes Risiko des Nutzers.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">9. Kündigung</h3>
          <p>
            Sie können Ihr Konto jederzeit in den Einstellungen unter „Konto löschen“ unwiderruflich beenden. Wir können Konten
            bei schwerwiegenden Verstößen gegen diese Bedingungen sperren oder löschen. Mit Kontolöschung endet Ihr Nutzungsrecht.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">10. Änderungen</h3>
          <p>
            Wir können diese Nutzungsbedingungen anpassen, wenn sachliche Gründe dies erfordern (z. B. neue Funktionen,
            Rechtsänderungen). Über wesentliche Änderungen informieren wir in der App oder per E-Mail. Widersprechen Sie nicht
            innerhalb von vier Wochen nach Mitteilung, gelten die geänderten Bedingungen als angenommen; hierauf werden wir Sie
            bei der Mitteilung hinweisen.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">11. Schlussbestimmungen</h3>
          <p>
            Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Für Verbraucher gilt diese
            Rechtswahl nur, soweit dadurch keine zwingenden Verbraucherschutzvorschriften des Staates ihres gewöhnlichen
            Aufenthalts entzogen werden. Gerichtsstand für Streitigkeiten mit Kaufleuten ist, soweit zulässig, der Sitz des
            Betreibers.
          </p>
          <p>
            Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen Regelungen unberührt.
          </p>
        </section>
      </div>
    </div>
  );
}
