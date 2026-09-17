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
            <p className="text-xs text-slate-500">Stand: September 2026</p>
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
            sowie Ihr Profilbild. Der Benutzername ist verpflichtend, weil andere Nutzerinnen und Nutzer Sie darüber
            finden und Einladungen zugeordnet werden; wenn Sie bei der Registrierung keinen angeben, erzeugen wir
            automatisch einen aus Ihrem Namen beziehungsweise aus dem Teil Ihrer E-Mail-Adresse vor dem @-Zeichen.
            Sie können ihn jederzeit in den Einstellungen ändern. Freiwillig können Sie Ihr Profil um eine Kurzbeschreibung und um je einen
            Instagram- und TikTok-Benutzernamen ergänzen. Diese Angaben speichern wir unverändert so, wie Sie sie
            eingeben; wir prüfen nicht, ob ein angegebenes Social-Media-Konto Ihnen gehört, und rufen die genannten
            Netzwerke nicht ab. Erst wenn jemand die Schaltfläche in Ihrem Profil antippt, öffnet dessen Gerät die
            Adresse des jeweiligen Netzwerks; ab diesem Zeitpunkt gilt die Datenschutzerklärung von Instagram bzw.
            TikTok. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung), für die freiwilligen Angaben
            Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) – Sie können sie in den Einstellungen jederzeit wieder entfernen.
          </p>
          <p>
            In der mobilen App geben Sie Namen, Profilbild und Benutzernamen an, bevor Sie Ihr Konto anlegen. Diese
            Angaben bleiben bis zur Registrierung ausschließlich auf Ihrem Gerät; Ihr Profilbild wird dabei bereits auf
            dem Gerät verkleinert und von Metadaten wie dem Aufnahmeort befreit. Brechen Sie die Registrierung ab, löscht
            die App einen Entwurf, der sieben Tage lang nicht bearbeitet wurde, beim nächsten Start; mit dem Löschen
            der App ist er ebenfalls entfernt. Eine Ausnahme gilt für die Prüfung, ob ein gewünschter
            Benutzername noch frei ist: Dafür übermittelt die App den Benutzernamen an uns. Wir gleichen ihn mit den
            vergebenen Benutzernamen ab und speichern ihn nicht. Um diese Abfrage vor massenhaftem Missbrauch zu
            schützen, zählen wir die Anfragen je IP-Adresse; gespeichert wird dafür nur ein nicht umkehrbarer Hashwert
            der IP-Adresse zusammen mit einem Zähler für ein Zeitfenster von einer Stunde, danach wird er gelöscht.
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Durchführung vorvertraglicher Maßnahmen auf Ihre Anfrage)
            sowie für die Begrenzung Art. 6 Abs. 1 lit. f DSGVO (Schutz vor Missbrauch).
          </p>
          <p>
            Bei der Registrierung stimmen Sie unseren Nutzungsbedingungen zu. Damit wir die Zustimmung nachweisen
            können, speichern wir, welcher Fassung Sie wann zugestimmt haben. Diese Angabe ist nicht öffentlich und in
            Ihrer Datenauskunft enthalten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b und lit. f DSGVO.
          </p>

          <h4 className="font-semibold text-slate-800">Empfehlungen und Aktivitäten</h4>
          <p>
            Wenn Sie einen Ort empfehlen, werden Ortsbezeichnung, geografische Koordinaten, Bewertung, Beschreibung,
            Kategorien und optional Bilder erfasst und mit Ihrem Profil verknüpft. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b
            DSGVO.
          </p>

          <h4 className="font-semibold text-slate-800">Freundschaftsbeziehungen und Interaktionen</h4>
          <p>
            Die App verarbeitet Freundschaftsanfragen und angenommene Freundschaften, Ihre Kommentare zu Empfehlungen,
            das Markieren von Kommentaren als „gefällt mir“ sowie Ihre Merkliste (gespeicherte Empfehlungen anderer).
            Zu jeder dieser Interaktionen speichern wir, wer sie ausgelöst hat, worauf sie sich bezieht und wann sie
            erfolgt ist. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
          </p>
          <p>
            Angenommene Freundschaften sind dabei nicht nur für die beiden beteiligten Personen sichtbar – Näheres dazu
            in Abschnitt 4.
          </p>
          <p>
            Aus organisatorischen Gründen ist die Zahl der Freundschaftsanfragen begrenzt (derzeit 50 pro 24 Stunden);
            hierfür führen wir einen technischen Zähler zu Ihrem Konto. Offene Anfragen verfallen nach 60 Tagen.
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (Schutz vor Missbrauch).
          </p>

          <h4 className="font-semibold text-slate-800">Reposts (Weitergabe fremder Empfehlungen)</h4>
          <p>
            Sie können die Empfehlung einer befreundeten Person als eigenen Beitrag an Ihr eigenes Netzwerk weitergeben
            („Repost“). Technisch entsteht dabei ein neuer, eigenständiger Beitrag in Ihrem Konto. Gespeichert werden
            zusätzlich die Verknüpfung zum weitergegebenen Beitrag und die Nutzer-ID der Person, von der die Empfehlung
            ursprünglich stammt, damit diese in der App als Urheberin genannt werden kann („Credits an …“). Diese
            Urheberangabe bleibt auch dann bestehen, wenn der ursprüngliche Beitrag später gelöscht wird. Ebenfalls
            gespeichert wird, wie oft ein Beitrag weitergegeben wurde. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
          </p>
          <p>
            Beim Repost werden die Bilder des ursprünglichen Beitrags nicht kopiert, sondern weiterverwendet; sie bleiben
            also demselben Speicherobjekt zugeordnet. Wer eine Empfehlung veröffentlicht, kann die Weitergabe beim
            Erstellen unterbinden (Funktion „Gatekeepen“). Was ein Repost für die Sichtbarkeit Ihrer Inhalte bedeutet,
            beschreibt Abschnitt 4.
          </p>

          <h4 className="font-semibold text-slate-800">Melden und Blockieren</h4>
          <p>
            Melden Sie einen Beitrag oder ein Profil, speichern wir den gemeldeten Beitrag bzw. die gemeldete Person,
            Ihre Nutzer-ID als meldende Person, den von Ihnen gewählten Grund und Ihre optionale Ergänzung, den
            Bearbeitungsstand und den Zeitpunkt. Über das Ergebnis der Prüfung erhalten Sie eine Mitteilung in der App.
            Ihre Identität als meldende Person geben wir dabei nicht an die gemeldete Person weiter. Blockieren Sie eine andere Person, speichern wir beide Nutzer-IDs und
            den Zeitpunkt; bestehende Freundschaften und Anfragen zwischen Ihnen werden dabei automatisch aufgelöst.
            Eine Blockierung ist für die blockierte Person nicht einsehbar und wird ihr auch im Rahmen einer
            Datenauskunft nicht offengelegt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b und lit. f DSGVO.
          </p>

          <h4 className="font-semibold text-slate-800">Bewerbung als Content Creator</h4>
          <p>
            Bewerben Sie sich um den Content-Creator-Status, speichern wir Ihre Nutzer-ID, Ihre freiwillige
            Begründung, die zu diesem Zeitpunkt in Ihrem Profil hinterlegten Instagram- und TikTok-Benutzernamen
            (als unveränderlichen Schnappschuss, damit eine spätere Änderung die Entscheidungsgrundlage nicht
            nachträglich verschiebt), den Zeitpunkt sowie unsere Entscheidung nebst Datum und einer etwaigen Notiz
            an Sie. Voraussetzung ist allein ein gesetzter Benutzername. Über das Ergebnis informieren wir Sie im
            Mitteilungsbereich der App. Bewerbungen und Entscheidungen sind Teil der Datenauskunft, die Sie in den
            Einstellungen exportieren können. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Durchführung
            vorvertraglicher Maßnahmen auf Ihre Anfrage) sowie Art. 6 Abs. 1 lit. f DSGVO.
          </p>

          <h4 className="font-semibold text-slate-800">Entscheidungen über Inhalte</h4>
          <p>
            Entfernen wir einen Ihrer Inhalte, setzen wir einzelne Profilangaben zurück oder sperren wir Ihr Konto,
            speichern wir dazu einen Eintrag: die Maßnahme, den betroffenen Beitrag (samt seiner Bezeichnung zum
            Zeitpunkt der Entfernung), den Grund, ob wir uns auf unsere Nutzungsbedingungen oder auf geltendes Recht
            stützen, ob eine Meldung oder eine eigene Prüfung Anlass war, ob automatisierte Mittel eingesetzt wurden,
            eine etwaige Erläuterung und den Zeitpunkt. Dieser Eintrag ist die Begründung, die Art. 17 der Verordnung
            über digitale Dienste vorsieht; Sie können ihn jederzeit über die Datenauskunft in den Einstellungen
            abrufen. Wer die Meldung eingereicht hat, ist darin nicht enthalten. Rechtsgrundlage ist Art. 6 Abs. 1
            lit. c DSGVO (rechtliche Verpflichtung) sowie Art. 6 Abs. 1 lit. f DSGVO.
          </p>

          <h4 className="font-semibold text-slate-800">Mitteilungen in der App</h4>
          <p>
            Zu Ereignissen in Ihrem Netzwerk (neue Empfehlung, Kommentar, Speicherung, Weitergabe, Freundschaftsanfrage
            und -annahme) legen wir je Empfänger einen Eintrag im Mitteilungs-Bereich an. Gespeichert werden die Art des
            Ereignisses, die auslösende Person, der betroffene Beitrag, Titel und Text der Mitteilung sowie der
            Lesezeitpunkt. Diese Einträge entstehen unabhängig davon, ob Sie Push-Nachrichten aktiviert haben.
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
          </p>

          <h4 className="font-semibold text-slate-800">Freundschaftsvorschläge</h4>
          <p>
            Um Ihnen Personen vorzuschlagen, die Sie kennen könnten, wertet unser Server bestehende Freundschaften aus und
            ermittelt Personen, mit denen Sie gemeinsame Freunde haben, sortiert nach deren Anzahl. Ausgeschlossen sind
            dabei Sie selbst, bestehende Freundschaften und Anfragen sowie blockierte und gesperrte Konten. Angezeigt
            werden nur Angaben, die ohnehin zum öffentlichen Profil gehören. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f
            DSGVO (berechtigtes Interesse an der Vernetzungsfunktion einer sozialen App).
          </p>
          <p>
            Wer noch niemanden kennt, bekäme auf diesem Weg gar keinen Vorschlag. Deshalb schlagen wir zusätzlich Konten
            vor, mit denen Sie noch nichts verbindet. Dafür wertet unser Server aus, wie viele Empfehlungen ein Konto
            veröffentlicht hat und wie viele Freundschaften es unterhält; berücksichtigt werden nur Konten mit
            mindestens einer Empfehlung und bestätigter E-Mail-Adresse. <strong>Ihre Freundeszahl dient dabei
            ausschließlich der Reihenfolge und wird niemandem angezeigt.</strong> Die Zahl Ihrer Empfehlungen steht
            dagegen am Vorschlag, weil er sonst keine Begründung hätte. Sichtbar wird für die vorgeschlagene Person
            damit, was ohnehin zum öffentlichen Profil gehört, und wie viele Empfehlungen sie veröffentlicht hat –
            nicht welche und nicht wo. Die Reihenfolge wechselt täglich und unterscheidet sich von
            Betrachter zu Betrachter, damit daraus keine Rangliste ablesbar ist. Ortsdaten werden dabei nicht
            ausgewertet. <strong>Sie können dieser Verwendung jederzeit widersprechen</strong>, indem Sie in den
            Einstellungen unter „Daten und Privatsphäre“ den Schalter „Vorschlägen erlauben“ ausschalten; Ihr Konto
            erscheint dann nicht mehr in dieser Liste. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
            Interesse daran, dass ein neues Konto überhaupt Anschluss findet).
          </p>

          <h4 className="font-semibold text-slate-800">Übernahme von Orten aus Google Maps</h4>
          <p>
            Sie können Orte aus Google Maps übernehmen, und zwar auf zwei Wegen. Teilen Sie einen Ort über die
            Teilen-Funktion von Google Maps an die App, wird der enthaltene Kurzlink auf unserem Server aufgelöst und der
            Ort ermittelt; dabei wird eine Anfrage an Google gerichtet. Alternativ können Sie die Datei Ihrer
            Google-Bewertungen aus Google Takeout auswählen. Diese Datei wird ausschließlich auf Ihrem Gerät gelesen und
            nicht an uns übertragen; gespeichert werden nur die Einträge, die Sie anschließend selbst als Empfehlung
            veröffentlichen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
          </p>

          <h4 className="font-semibold text-slate-800">Bestätigung der E-Mail-Adresse</h4>
          <p>
            Zur Bestätigung Ihrer Adresse erzeugen wir einen einmaligen Token mit Ablaufdatum und ordnen ihn Ihrem Konto
            zu. Ein erneuter Versand ist auf eine Nachricht pro Minute begrenzt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b
            und lit. f DSGVO (Schutz vor Missbrauch).
          </p>

          <h4 className="font-semibold text-slate-800">Sperrung von Konten</h4>
          <p>
            Wird ein Konto wegen eines Verstoßes gegen unsere Nutzungsbedingungen gesperrt, vermerken wir den Zeitpunkt
            der Sperrung am Profil. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO sowie Art. 6 Abs. 1 lit. c DSGVO.
          </p>

          <h4 className="font-semibold text-slate-800">Freundeseinladungen</h4>
          <p>
            Wenn Sie einen Einladungslink teilen, speichern wir einen eindeutigen Token, Ihre Nutzer-ID als Ersteller,
            die Anzahl der Nutzungen sowie ein Ablaufdatum. Diese Daten dienen der sicheren Freundschaftsverknüpfung
            (Art. 6 Abs. 1 lit. b DSGVO).
          </p>

          <h4 className="font-semibold text-slate-800">Hochgeladene Medien (Supabase Storage)</h4>
          <p>
            Profilbilder werden im Speicherbereich „avatars“ abgelegt, Aktivitätsfotos und die automatisch erzeugten
            Kartenvorschaubilder im Bereich „activity-images“. Beide Bereiche sind als öffentliche Speicher-Buckets
            konfiguriert. Das bedeutet konkret: Die Dateien sind ohne Anmeldung abrufbar, sobald die vollständige
            Datei-URL bekannt ist. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
          </p>
          <p>
            Der Speicher lässt sich nicht auflisten oder durchsuchen, und jeder Dateiname enthält eine zufällige,
            nicht erratbare Komponente – die URLs sind also nicht öffentlich zugänglich, sondern nur demjenigen bekannt,
            dem die App sie anzeigt. Wer eine solche URL jedoch einmal erhalten hat, kann die Datei weiterhin abrufen,
            auch wenn der zugehörige Beitrag später nur noch einem eingeschränkten Empfängerkreis (z. B. Freunden)
            angezeigt wird. Bitte berücksichtigen Sie das bei Fotos, die Sie als besonders sensibel empfinden.
          </p>
          <p>
            Fotos werden vor dem Hochladen auf Ihrem Gerät verkleinert und neu als JPEG kodiert. Dabei werden die
            Metadaten der Aufnahme (EXIF) entfernt, insbesondere die GPS-Koordinaten des Aufnahmeorts und die
            Gerätekennung; diese Daten erreichen unsere Server nicht. Kann ein Foto auf dem Gerät nicht verarbeitet
            werden, lehnen wir den Upload ab, statt die unveränderte Originaldatei zu übertragen.
          </p>

          <h4 className="font-semibold text-slate-800">Kontaktabgleich (nur mobile App)</h4>
          <p>
            In der mobilen App können Sie freiwillig Ihr Adressbuch mit places4friends abgleichen, um Kontakte zu finden,
            die die App bereits nutzen. Der Abgleich erfolgt über Prüfsummen: Die E-Mail-Adressen und Telefonnummern
            Ihrer Kontakte werden auf dem Gerät vereinheitlicht und zu SHA-256-Hashwerten umgerechnet; nur diese
            Hashwerte werden übertragen und mit den bei uns hinterlegten Angaben registrierter Nutzer verglichen. Namen
            und sonstige Kontaktdaten verlassen Ihr Gerät nicht, und die übermittelten Hashwerte werden nach dem
            Vergleich verworfen, nicht gespeichert. Wir weisen darauf hin, dass sich Hashwerte von Telefonnummern wegen
            der begrenzten Zahl möglicher Nummern grundsätzlich zurückrechnen ließen; wir tun das nicht. Gefunden wird
            eine Person über ihre Telefonnummer nur, wenn sie diese Nummer selbst hinterlegt und bestätigt hat (siehe
            nächster Abschnitt), über eine E-Mail-Adresse nur, wenn sie sich damit registriert hat. Rechtsgrundlage für
            den Abgleich ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die Sie durch das Verweigern bzw. Entziehen
            der Kontaktberechtigung in den Geräteeinstellungen widerrufen können; für die kurzzeitige Verarbeitung der
            Hashwerte Ihrer Kontakte, die nicht selbst eingewilligt haben, stützen wir uns auf Art. 6 Abs. 1 lit. f DSGVO
            (berechtigtes Interesse, einander bekannte Personen zusammenzuführen). Um massenhafte Abfragen zu verhindern,
            ist die Zahl der Abgleiche je Konto begrenzt.
          </p>

          <h4 className="font-semibold text-slate-800">Telefonnummer (freiwillig, nur mobile App)</h4>
          <p>
            Sie können in der mobilen App Ihre Handynummer hinterlegen, damit Personen, die diese Nummer in ihrem
            Adressbuch gespeichert haben, Sie beim Kontaktabgleich finden. Damit niemand eine fremde Nummer eintragen
            kann, bestätigen Sie die Nummer mit einem Code, den wir Ihnen per SMS schicken. Bis zur Bestätigung,
            höchstens zehn Minuten lang, speichern wir die Nummer zusammen mit einer Prüfsumme des Codes. Nach der
            Bestätigung speichern wir die Nummer selbst nicht mehr, sondern nur einen mit einem geheimen Schlüssel
            gebildeten Hashwert (HMAC) sowie die letzten zwei Ziffern, damit Sie in den Einstellungen erkennen, welche
            Nummer hinterlegt ist. Bestätigt ein anderes Konto später dieselbe Nummer, wird sie bei Ihrem Konto entfernt.
            Um Missbrauch und Kosten zu begrenzen, zählen wir die angeforderten Codes je Konto und je Nummer (letztere als
            Hashwert) für höchstens einen Tag. Sie können die Nummer in den Einstellungen jederzeit entfernen; sie ist
            außerdem in Ihrer Datenauskunft enthalten. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a
            DSGVO).
          </p>

          <h4 className="font-semibold text-slate-800">Push-Benachrichtigungen (nur mobile App)</h4>
          <p>
            Wenn Sie Push-Benachrichtigungen zulassen, speichern wir das von Ihrem Gerät ausgestellte Push-Token, um Sie
            über Freundschaftsanfragen, Kommentare und neue Empfehlungen zu informieren. Beim Abmelden und beim Löschen des
            Kontos wird das Token entfernt. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), widerrufbar
            in den Geräteeinstellungen bzw. über den Benachrichtigungsschalter in der App.
          </p>

          <h4 className="font-semibold text-slate-800">Lokale Speicherung in der mobilen App</h4>
          <p>
            Die mobile App speichert auf dem Gerät (AsyncStorage) Ihre Anmeldesitzung sowie Einstellungen wie Kartenansicht,
            Sprachwahl, Fortschritt der Einführungstour und zuletzt verwendete Filter. Diese Daten verbleiben auf dem Gerät
            und werden mit der Deinstallation entfernt.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">4. Sichtbarkeit Ihrer Inhalte</h3>
          <p>
            places4friends ist keine öffentliche Plattform: Empfehlungen, Kommentare und Merklisten sind grundsätzlich
            nur für Sie und Ihre bestätigten Freundinnen und Freunde sichtbar. Diese Beschränkung wird serverseitig
            durchgesetzt. Es gibt jedoch acht Fälle, in denen Angaben darüber hinaus sichtbar werden, und wir halten
            sie hier ausdrücklich fest:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>
              <strong>Profilangaben sind für alle angemeldeten Nutzer sichtbar.</strong> Das betrifft Ihren
              Benutzernamen, Ihren angezeigten Namen, Ihr Profilbild, Ihre Kurzbeschreibung („Bio“) und die von Ihnen
              angegebenen Instagram- und TikTok-Benutzernamen. Diese Angaben sind nicht auf Ihren Freundeskreis
              beschränkt – nur so lassen sich Personen finden, Einladungen zuordnen und Urheberangaben anzeigen.
              Kurzbeschreibung und Social-Media-Benutzernamen sind freiwillig und lassen sich in den Einstellungen
              jederzeit wieder entfernen; solange sie hinterlegt sind, behandeln Sie sie bitte als öffentlich. Ihre
              Empfehlungen bleiben dabei verborgen; wer nicht mit Ihnen befreundet ist, sieht auf Ihrem Profil den
              Hinweis, dass die Beiträge privat sind.
            </li>
            <li>
              <strong>Ihre Freundschaften sind nicht privat.</strong> Wer mit Ihnen befreundet ist, kann Ihre
              vollständige Freundesliste einsehen. Wer es nicht ist, sieht auf Ihrem Profil die
              <em> gemeinsamen</em> Freundinnen und Freunde – also genau die Personen, mit denen sowohl Sie als auch die
              betrachtende Person befreundet sind. Wer mit niemandem aus Ihrem Freundeskreis befreundet ist, sieht an
              dieser Stelle niemanden. Diese Anzeige ist der Zweck der Funktion: Sie soll einordnen helfen, wer Ihnen
              eine Anfrage schickt. Umgekehrt heißt das, dass eine Freundschaft zwischen Ihnen und einer anderen Person
              auch für Dritte erkennbar sein kann, sofern diese mit einer der beiden Personen befreundet sind. Davon
              ausgenommen sind Freundschaften mit einem Content Creator: sie erscheinen weder in Ihrer Freundesliste,
              wie Dritte sie sehen, noch bei den gemeinsamen Freundinnen und Freunden. Andernfalls ließe sich aus den
              Listen einzelner Personen rekonstruieren, wer einem Content Creator folgt.
            </li>
            <li>
              <strong>Das Profil eines Content Creators ist öffentlich.</strong> Wir können ein Konto auf Antrag oder von
              uns aus als „Content Creator“ freischalten und diesen Status jederzeit wieder entziehen. Solange er
              besteht, sind die Empfehlungen dieses Kontos, die Kommentare darunter sowie die Listen, wer sie
              gespeichert und wer sie weitergegeben hat, für <em>alle</em> angemeldeten Nutzer sichtbar – nicht nur für
              den Freundeskreis. Das gilt <strong>rückwirkend</strong>, also auch für Beiträge und Kommentare, die vor
              der Freischaltung entstanden sind; wer unter dem Beitrag eines später freigeschalteten Kontos kommentiert
              hat, dessen Kommentar wird damit ebenfalls öffentlich. Andere Nutzer können einem Content Creator mit
              einem Tippen folgen, ohne dass dieser zustimmen muss. Wer einem Content Creator folgt, ist für andere
              nicht einsehbar – sichtbar ist nur die Anzahl. Auf der Karte und im Aktivitäten-Feed erscheinen die
              Beiträge eines Content Creators weiterhin erst, wenn Sie ihm folgen.
            </li>
            <li>
              <strong>Reposts erweitern den Empfängerkreis.</strong> Gibt eine befreundete Person Ihre Empfehlung weiter,
              erreicht deren Inhalt – Ortsangabe, Beschreibung und Bilder – auch die Freunde dieser Person, die Sie
              nicht kennen müssen. Ihr Name wird dabei als Urheberin bzw. Urheber genannt und ist damit auch für
              Personen sichtbar, mit denen Sie nicht befreundet sind. Ihre Kommentare wandern nicht mit: Ein Repost hat
              einen eigenen Kommentarbereich, den nur das Netzwerk der weitergebenden Person sieht. Möchten Sie eine
              Weitergabe ausschließen, aktivieren Sie beim Erstellen die Option „Gatekeepen“.
            </li>
            <li>
              <strong>Hochgeladene Dateien liegen unter einer nicht öffentlich verlinkten Adresse.</strong> Wie in
              Abschnitt 3 beschrieben, kann jede Person eine Bilddatei abrufen, die deren vollständige URL kennt –
              unabhängig von einer Freundschaft und auch nach deren Ende.
            </li>
            <li>
              <strong>Wie viele Empfehlungen Sie veröffentlicht haben, ist für alle angemeldeten Nutzer sichtbar.</strong>{" "}
              Diese Zahl steht auf Ihrem Profil, und zwar unabhängig von einer Freundschaft. Die Empfehlungen selbst
              bleiben dabei verborgen: Wer nicht mit Ihnen befreundet ist, sieht die Zahl, aber weder die Orte noch die
              Beschreibungen oder Bilder dahinter. Haben Sie mindestens eine Empfehlung veröffentlicht, kann Ihr Profil
              anderen außerdem als Vorschlag erscheinen, auch ohne gemeinsame Freundinnen und Freunde und ohne dass Sie
              in deren Adressbuch stehen; wie Abschnitt 3 beschreibt, lässt sich <em>diese</em> Anzeige in den
              Einstellungen abschalten. Die Zahl auf Ihrem Profil bleibt davon unberührt.
            </li>
            <li>
              <strong>Wer Ihre Telefonnummer kennt, kann Ihr Profil finden.</strong> Haben Sie in der mobilen App eine
              Handynummer hinterlegt und bestätigt, erscheint Ihr Profil beim Kontaktabgleich jeder Person als
              Vorschlag, die diese Nummer in ihrem Adressbuch gespeichert hat, auch wenn Sie mit ihr nicht befreundet
              sind. Die Nummer selbst wird dabei niemandem angezeigt; erkennbar wird nur, dass das Profil zu einer Nummer
              gehört, die die andere Person bereits kennt. Ohne hinterlegte Nummer entfällt dieser Weg, und Sie können
              die Nummer in den Einstellungen jederzeit entfernen.
            </li>
            <li>
              <strong>Der Betreiber hat administrativen Zugriff</strong> zu Moderationszwecken; siehe Abschnitt 5.
            </li>
          </ul>
          <p>
            Blockieren Sie eine Person, werden Sie und diese Person einander in der App verborgen – einschließlich der
            Profile, offener Anfragen und der wechselseitigen Kommentare unter Beiträgen gemeinsamer Freunde. Bereits
            weitergegebene Inhalte lassen sich dadurch nicht zurückholen.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">5. Moderation und Zugriff auf Inhalte</h3>
          <p>
            Zur Gewährleistung eines sicheren und rechtskonformen Betriebs prüfen wir gemeldete Inhalte und moderieren
            die in der App eingestellten Beiträge. Nutzer können Inhalte und andere Nutzer über die Melde- und
            Blockierfunktion melden bzw. blockieren.
          </p>
          <p>
            Der Betreiber kann in seiner Funktion als Administrator technisch auf sämtliche in der App eingestellten
            Inhalte zugreifen – einschließlich solcher, die nur für einen begrenzten Empfängerkreis (z. B. Freunde)
            sichtbar sind. Dieser Zugriff erfolgt ausschließlich zu Moderations- und Sicherheitszwecken, insbesondere zur
            Prüfung von Meldungen, zur Durchsetzung unserer{" "}
            <Link href="/agb" className="text-brand-green-700 hover:underline">
              Nutzungsbedingungen
            </Link>{" "}
            und zur Erfüllung gesetzlicher Pflichten, und bleibt auf das hierfür erforderliche Maß beschränkt.
          </p>
          <p>
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Sicherheit der Plattform und
            dem Schutz der Nutzer) sowie Art. 6 Abs. 1 lit. c DSGVO (Erfüllung rechtlicher Verpflichtungen, u. a. nach dem
            Gesetz über digitale Dienste).
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">6. Drittanbieter und Infrastruktur</h3>

          <h4 className="font-semibold text-slate-800">Vercel (Hosting)</h4>
          <p>
            Diese App wird bei Vercel Inc. gehostet. Dabei werden technisch notwendige Server-Logdaten (z. B. IP-Adresse,
            Zeitpunkt des Zugriffs, angeforderte URL) verarbeitet. Für die ungefähre Standortbestimmung nutzen wir, soweit
            verfügbar, von Vercel bereitgestellte Geo-Header (z. B. x-vercel-ip-latitude). Rechtsgrundlage ist Art. 6 Abs. 1
            lit. f DSGVO (berechtigtes Interesse an sicherem Betrieb). Mit Vercel besteht ein Vertrag zur Auftragsverarbeitung
            gemäß Art. 28 DSGVO.
          </p>

          <h4 className="font-semibold text-slate-800">Supabase (Backend, Datenbank, Speicher und Authentifizierung)</h4>
          <p>
            Registrierungsdaten, Profildetails, Inhalte und hochgeladene Dateien werden bei Supabase Inc. gespeichert. Das
            genutzte Projekt liegt in der Region „eu-central-1“ (Frankfurt am Main, Deutschland); Datenbank und Dateispeicher
            werden dort betrieben. Mit Supabase besteht ein AVV gemäß Art. 28 DSGVO.
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

          <h4 className="font-semibold text-slate-800">Anmeldung mit Google oder Apple</h4>
          <p>
            Sie können sich alternativ mit einem Google- oder Apple-Konto anmelden. Dabei übermittelt der jeweilige
            Anbieter (Google Ireland Limited bzw. Apple Distribution International Ltd.) an uns ein Anmelde-Token sowie
            Ihre E-Mail-Adresse und, sofern vorhanden, Ihren Namen und Ihr Profilbild. Bei „Mit Apple anmelden“ können Sie
            Ihre Adresse verbergen; wir erhalten dann eine Weiterleitungsadresse von Apple. Rechtsgrundlage ist Art. 6
            Abs. 1 lit. b DSGVO.
          </p>

          <h4 className="font-semibold text-slate-800">Auflösen geteilter Google-Maps-Links</h4>
          <p>
            Teilen Sie einen Ort aus Google Maps an die App, ruft unser Server den enthaltenen Kurzlink ab, um den Ort zu
            bestimmen. Dabei erfährt Google, dass dieser Link abgerufen wurde; Ihre IP-Adresse wird nicht übermittelt, da
            die Anfrage von unserem Server ausgeht. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
          </p>

          <h4 className="font-semibold text-slate-800">Geoapify (Kartenvorschaubilder)</h4>
          <p>
            Für die kleine Kartenvorschau auf einer Empfehlung erzeugen wir serverseitig ein statisches Kartenbild über die
            Geoapify GmbH, Gersthofen, Deutschland. Dabei werden die Koordinaten des empfohlenen Ortes an Geoapify
            übermittelt; ein Personenbezug wird nicht mitgeteilt. Das erzeugte Bild wird in unserem eigenen Speicher
            abgelegt, sodass pro Ort nur einmal angefragt wird. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.
          </p>

          <h4 className="font-semibold text-slate-800">Resend (Versand von Bestätigungs-E-Mails)</h4>
          <p>
            Zur Bestätigung Ihrer E-Mail-Adresse versenden wir eine Nachricht über Resend, Inc. (USA). Dabei werden Ihre
            E-Mail-Adresse und der Bestätigungslink an Resend übermittelt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
          </p>

          <h4 className="font-semibold text-slate-800">seven (Versand von Bestätigungs-SMS)</h4>
          <p>
            Zur Bestätigung einer hinterlegten Telefonnummer versenden wir eine SMS über die seven communications GmbH &amp;
            Co. KG, Willestr. 4–6, 24103 Kiel, Deutschland. Dabei werden Ihre Telefonnummer und der Text der SMS mit dem
            Bestätigungscode an seven übermittelt. Mit seven besteht ein Vertrag zur Auftragsverarbeitung gemäß Art. 28
            DSGVO. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).
          </p>

          <h4 className="font-semibold text-slate-800">Expo, Apple und Google (Zustellung von Push-Nachrichten)</h4>
          <p>
            Push-Nachrichten der mobilen App werden über den Dienst von Expo (650 Industries, Inc., USA) an die
            Zustellsysteme von Apple (APNs) bzw. Google (FCM) übergeben. Übermittelt werden das Push-Token Ihres Geräts
            sowie Titel und Text der Benachrichtigung, die den Anlass benennen (z. B. den Namen einer Person oder eines
            Ortes). Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).
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
          <h3 className="text-base font-bold text-slate-900">7. Cookies und lokale Speicherung</h3>
          <p>
            Die folgenden Angaben betreffen die Nutzung im Browser; zur Speicherung in der mobilen App siehe Abschnitt 3.
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
          <h3 className="text-base font-bold text-slate-900">8. Speicherdauer</h3>
          <p>
            Personenbezogene Daten speichern wir, solange Ihr Konto besteht. Nach Löschung Ihres Kontos werden Ihre Daten
            gelöscht, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen. Löschen Sie einen einzelnen Beitrag
            oder Ihr Profilbild, werden die zugehörigen Dateien aus dem Speicher entfernt; bereits an Endgeräte
            ausgelieferte Kopien in deren Zwischenspeichern (Caches) entziehen sich unserem Zugriff. IP-basierte
            Zwischenwerte im Server-Arbeitsspeicher werden nach höchstens einer Stunde verworfen. Einladungslinks verfallen
            nach Ablauf der jeweiligen Gültigkeitsdauer. Push-Token werden beim Abmelden entfernt. Eine noch nicht
            bestätigte Telefonnummer wird nach zehn Minuten ungültig und bei der nächsten Bestätigung oder beim Entfernen
            gelöscht; die Zähler für angeforderte SMS-Codes werden nach spätestens zwei Tagen gelöscht. Einträge zu
            Entscheidungen über Inhalte bewahren wir auf, solange Ihr Konto besteht – sie sind der Nachweis, dass eine
            Maßnahme begründet mitgeteilt wurde, und die Grundlage für einen Widerspruch.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">9. Drittlandübermittlung</h3>
          <p>
            Einige der genannten Anbieter (z. B. Mapbox, Google, Supabase, Vercel, Resend, Expo, ipapi.co) haben ihren Sitz
            in den USA oder verarbeiten Daten auch dort. Das gilt auch dann, wenn die Daten – wie bei Supabase – auf
            Servern in der EU liegen, weil ein administrativer Zugriff aus den USA nicht ausgeschlossen werden kann. Für
            Übermittlungen in Drittländer setzen wir geeignete Garantien ein, insbesondere Standardvertragsklauseln der
            EU-Kommission (Art. 46 DSGVO), und schließen mit Auftragsverarbeitern Verträge gemäß Art. 28 DSGVO ab.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">10. Ihre Rechte</h3>
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
            <strong>In der App:</strong> Unter Profil → Einstellungen → „Daten &amp; Privatsphäre“ können Sie Ihre Daten als
            JSON-Datei exportieren und Ihr Konto unwiderruflich löschen. Profildaten können Sie dort ebenfalls bearbeiten.
          </p>
          <p>
            Der Export enthält alle Datensätze, die Ihrem Konto in unserer Datenbank zugeordnet sind: Profil, Ihre
            Empfehlungen (einschließlich Reposts) mit den Links zu den zugehörigen Bilddateien, Ihre Kommentare und
            Kommentar-Likes, Freundschaften und -anfragen, Merkliste, Einladungslinks, Ihre Mitteilungen, registrierte
            Geräte, von Ihnen erstattete Meldungen, von Ihnen ausgesprochene Blockierungen sowie die technischen Einträge
            zu E-Mail-Bestätigung, Kontaktabgleich und Nutzungszählern.
          </p>
          <p>
            Nicht enthalten sind Daten, die zugleich Daten anderer Personen sind (Art. 15 Abs. 4 DSGVO): Kommentare
            anderer unter Ihren Beiträgen, Reposts Ihrer Empfehlungen durch andere, Meldungen über Ihre Beiträge sowie
            Blockierungen, die andere gegen Sie ausgesprochen haben. Sicherheits-Token (Push-Token, Bestätigungs-Token)
            sind als „[redacted]“ gekennzeichnet, da sie Zugangsmittel und keine Information über Sie sind. Die Datei
            benennt diese Einschränkungen selbst in einem Abschnitt „notes“.
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
