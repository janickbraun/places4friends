import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import StorageNotice from "@/components/StorageNotice";
import AuthProvider from "@/components/auth/AuthProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL
      ? `https://${process.env.NEXT_PUBLIC_SITE_URL}`
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"
  ),
  title: {
    default: "places4friends - Finde & teile Lieblingsorte mit Freunden",
    template: "%s | places4friends",
  },
  description: "Erstelle eine interaktive Karte mit deinen Freunden. Empfiehl Restaurants, Bars, Cafés und Aktivitäten ohne anonyme Reise-Bewertungen - direkt von deinen Freunden empfohlen.",
  keywords: ["Lieblingsorte", "Freunde", "Karte", "Empfehlungen", "Restaurants", "Bars", "Cafés", "Social Map", "Mapbox", "Regensburg", "Reisetipps"],
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/logo-round.png",
    apple: "/logo.jpg",
  },
  openGraph: {
    title: "places4friends - Finde & teile Lieblingsorte mit Freunden",
    description: "Erstelle eine interaktive Karte mit deinen Freunden. Empfiehl Restaurants, Bars, Cafés und Aktivitäten ohne anonyme Reise-Bewertungen - direkt von deinen Freunden empfohlen.",
    images: [
      {
        url: "/socialbanner.jpg",
        width: 1200,
        height: 630,
        alt: "places4friends Social Banner",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "places4friends - Finde & teile Lieblingsorte mit Freunden",
    description: "Erstelle eine interaktive Karte mit deinen Freunden. Empfiehl Restaurants, Bars, Cafés und Aktivitäten ohne anonyme Reise-Bewertungen - direkt von deinen Freunden empfohlen.",
    images: ["/socialbanner.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#226622",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${inter.variable} h-full antialiased bg-slate-50`}
      suppressHydrationWarning
    >
      <body className="h-full flex justify-center items-center overflow-hidden" suppressHydrationWarning>
        {/* Mobile Device Frame for Desktop, Fullscreen for Mobile */}
        <div className="relative flex flex-col w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl h-full bg-white shadow-2xl sm:border-x sm:border-slate-100 overflow-hidden">
          <AuthProvider>
            {/* Main content scrollable wrapper */}
            <main className="flex-1 overflow-y-auto w-full no-scrollbar pb-4 bg-slate-50/20">
              {children}
            </main>

            <OnboardingOverlay />
            <StorageNotice />

            {/* Persistent Navigation Bar */}
            <BottomNav />
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
