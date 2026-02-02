"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!supabase) {
      router.push("/login?error=auth_not_configured");
      return;
    }

    const handleCallback = async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(
        window.location.href,
      );

      if (error) {
        console.error("Auth callback error:", error);
        router.push("/login?error=auth_callback_error");
        return;
      }

      router.push("/account");
    };

    handleCallback();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-foreground/60">Completing sign in...</p>
      </div>
    </div>
  );
}
