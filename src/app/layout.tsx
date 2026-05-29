import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import OnboardingOverlay from "@/components/OnboardingOverlay";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "places4friends",
  description: "Teile und erkunde interessante Orte mit deinen Freunden.",
  icons: {
    icon: "/logo-round.png",
    apple: "/logo.jpg",
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
          {/* Main content scrollable wrapper */}
          <main className="flex-1 overflow-y-auto w-full no-scrollbar pb-4 bg-slate-50/20">
            {children}
          </main>

          <OnboardingOverlay />
          
          {/* Persistent Navigation Bar */}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
