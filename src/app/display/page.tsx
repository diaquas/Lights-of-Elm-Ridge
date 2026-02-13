"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DisplayRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/the-show#display");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-foreground/60">Redirecting to The Show…</p>
    </div>
  );
}
