"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AuthPrompt from "@/components/AuthPrompt";

export type AuthGateContext = "profile" | "create" | "activities" | "friends";

interface AuthGateProps {
  context: AuthGateContext;
  headerTitle: string;
  titleClassName?: string;
  children: (user: User) => React.ReactNode;
}

export default function AuthGate({
  context,
  headerTitle,
  titleClassName = "text-lg font-bold text-slate-900",
  children,
}: AuthGateProps) {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(authUser);
      setLoading(false);
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const shell = (content: React.ReactNode) => (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20 font-sans">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-center border-b border-slate-100 bg-white px-4">
        <h1 className={titleClassName}>{headerTitle}</h1>
      </header>
      {content}
    </div>
  );

  if (loading) {
    return shell(
      <div className="flex flex-1 items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-brand-green-700" />
      </div>
    );
  }

  if (!user) {
    return shell(<AuthPrompt context={context} />);
  }

  return <>{children(user)}</>;
}
