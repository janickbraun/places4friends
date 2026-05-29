import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export default function ImpressumPage() {
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
        <h1 className="text-lg font-bold text-slate-900">Impressum</h1>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 text-sm leading-relaxed text-slate-700">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          <FileText className="h-8 w-8 text-brand-green-700 shrink-0" />
          <div>
            <h2 className="font-bold text-slate-800">Anbieterkennzeichnung</h2>
            <p className="text-xs text-slate-500">Angaben gemäß § 5 TMG</p>
          </div>
        </div>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">Betreiber der Anwendung</h3>
          <p className="font-semibold text-slate-800">places4friends GbR</p>
          <p>
            Musterstraße 123<br />
            10115 Berlin<br />
            Deutschland
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">Kontakt</h3>
          <p>
            Telefon: +49 (0) 30 1234567<br />
            E-Mail: support@places4friends.de
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">Vertretungsberechtigte Gesellschafter</h3>
          <p>Max Mustermann, Erika Musterfrau</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">Haftungsausschluss</h3>
          <p className="font-semibold text-slate-800">Haftung für Inhalte</p>
          <p>
            Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen
            Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet,
            übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf
            eine rechtswidrige Tätigkeit hinweisen.
          </p>
          <p className="font-semibold text-slate-800">Haftung für Links</p>
          <p>
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben.
            Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten
            Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
          </p>
        </section>
      </div>
    </div>
  );
}
