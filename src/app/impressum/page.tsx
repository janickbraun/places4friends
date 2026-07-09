import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Rechtliche Informationen und Anbieterkennzeichnung von places4friends.",
};

export default function ImpressumPage() {
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
        <h1 className="text-sm font-bold text-slate-900">Impressum</h1>
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
          <h3 className="text-base font-bold text-slate-900">Diensteanbieter</h3>
          <p className="font-semibold text-slate-800">Janick Braun</p>
          <p>
            Krottenkopfstr. 24a<br />
            82377 Penzberg<br />
            Deutschland
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">Kontakt</h3>
          <p>
            Telefon: +49 (0) 160 98640952<br />
            E-Mail: <a href="mailto:mail@janickbraun.com" className="text-brand-green-700 hover:underline">mail@janickbraun.com</a>
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">Verbraucherstreitbeilegung</h3>
          <p>
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">Haftungsausschluss</h3>
          <p className="font-semibold text-slate-800">Haftung für Inhalte und Links</p>
          <p>
            Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen
            Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir jedoch nicht verpflichtet, übermittelte oder gespeicherte
            fremde Informationen zu überwachen. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese
            Inhalte oder Links umgehend entfernen.
          </p>
        </section>
      </div>
    </div>
  );
}
