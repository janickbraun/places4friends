import ActivitiesPageClient from "@/app/activities/ActivitiesPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aktivitäten",
  description:
    "Entdecke die neuesten Aktivitäten und persönlichen Empfehlungen deiner Freunde auf places4friends.",
};

export default function ActivitiesPage() {
  return <ActivitiesPageClient />;
}
