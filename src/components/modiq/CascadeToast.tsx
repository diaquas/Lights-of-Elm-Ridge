"use client";

import { memo, useEffect, useState, useCallback } from "react";

export interface CascadeToastData {
  id: string;
  groupName: string;
  resolvedCount: number;
}

interface CascadeToastProps {
  toast: CascadeToastData;
  onDismiss: (id: string) => void;
}

/** Individual toast notification for group cascade feedback */
const CascadeToastItem = memo(function CascadeToastItem({
  toast,
  onDismiss,
}: CascadeToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Auto-dismiss after 3 seconds
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(toast.id), 200);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-500/15 border border-teal-500/30 shadow-lg backdrop-blur-sm transition-all duration-200 ${
        isExiting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"
      }`}
      style={{ willChange: "transform, opacity" }}
    >
      <svg
        className="w-5 h-5 text-teal-400 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-teal-300 truncate">
          {toast.groupName} mapped
        </div>
        <div className="text-xs text-teal-400/70">
          {toast.resolvedCount} child{toast.resolvedCount !== 1 ? "ren" : ""} resolved automatically
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onDismiss(toast.id), 200);
        }}
        className="text-teal-400/50 hover:text-teal-300 transition-colors flex-shrink-0"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
});

interface CascadeToastContainerProps {
  toasts: CascadeToastData[];
  onDismiss: (id: string) => void;
}

/** Container for cascade toast notifications - positioned at bottom right */
export default memo(function CascadeToastContainer({
  toasts,
  onDismiss,
}: CascadeToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <CascadeToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
});

/** Hook for managing cascade toasts */
export function useCascadeToasts() {
  const [toasts, setToasts] = useState<CascadeToastData[]>([]);

  const showCascadeToast = useCallback((groupName: string, resolvedCount: number) => {
    if (resolvedCount <= 0) return;
    const id = `${groupName}-${Date.now()}`;
    setToasts((prev) => [...prev, { id, groupName, resolvedCount }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showCascadeToast, dismissToast };
}
