import SettingsPageClient from "@/app/profile/settings/SettingsPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Einstellungen",
  description:
    "Verwalte deine Profileinstellungen, Kontodetails und Benachrichtigungen auf places4friends.",
};

export default function ProfileSettingsPage() {
  return <SettingsPageClient />;
}
