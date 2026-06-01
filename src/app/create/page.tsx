import CreatePageClient from "@/app/create/CreatePageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ort empfehlen",
  description:
    "Teile eine neue Empfehlung und hebe deine Highlights auf der Karte mit deinen Freunden hervor.",
};

export default function CreatePage() {
  return <CreatePageClient />;
}
