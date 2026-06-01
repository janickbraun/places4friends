"use client";

import RecommendView from "@/components/RecommendView";
import AuthGate from "@/components/auth/AuthGate";

export default function CreatePageClient() {
  return (
    <AuthGate context="create" headerTitle="Ort empfehlen">
      {() => (
        <div className="h-full w-full">
          <RecommendView />
        </div>
      )}
    </AuthGate>
  );
}
