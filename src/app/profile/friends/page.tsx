import FriendsPageClient from "@/app/profile/friends/FriendsPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Freunde & Anfragen",
  description:
    "Finde deine Freunde auf places4friends und verwalte deine Freundschaftsanfragen.",
};

export default function FriendsPage() {
  return <FriendsPageClient />;
}
