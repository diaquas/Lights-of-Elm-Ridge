"use client";

import { useEffect, useState } from "react";

interface CelebrationToastProps {
  title: string;
  description: string;
  duration?: number;
}

export function CelebrationToast({
  title,
  description,
  duration = 2000,
}: CelebrationToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div
        className="bg-surface border border-green-500/30 rounded-2xl p-8 shadow-2xl shadow-green-500/10 text-center animate-[bounce-in_0.4s_cubic-bezier(0.68,-0.55,0.265,1.55)]"
      >
        <div className="text-5xl mb-4">&#127881;</div>
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        <p className="text-foreground/50 mt-2">{description}</p>
      </div>
    </div>
  );
}
