"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PlaylistRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/the-show#playlist");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-foreground/60">Redirecting to The Show…</p>
    </div>
  );
}
