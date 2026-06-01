import ProfilePageClient from "@/app/profile/ProfilePageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mein Profil",
  description:
    "Verwalte deine Empfehlungen, Wunschliste und dein Profil auf places4friends.",
};

export default function ProfilePage() {
  return <ProfilePageClient />;
}
