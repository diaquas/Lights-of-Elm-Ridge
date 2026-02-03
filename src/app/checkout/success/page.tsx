"use client";

import { useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/contexts/CartContext";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { clearCart } = useCart();
  const hasClearedRef = useRef(false);

  // Clear the cart on successful checkout
  useEffect(() => {
    if (sessionId && !hasClearedRef.current) {
      hasClearedRef.current = true;
      clearCart();
    }
  }, [sessionId, clearCart]);

  return (
    <>
      {sessionId && (
        <p className="text-xs text-foreground/50 mb-8">
          Order ID: {sessionId.slice(0, 20)}...
        </p>
      )}
    </>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-surface rounded-xl border border-border p-12">
          {/* Success Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-green-500"
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
          </div>

          <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>

          <p className="text-foreground/70 mb-6">
            Thank you for your purchase! Your sequences are now available for
            download.
          </p>

          <Suspense fallback={<div className="h-6 mb-8" />}>
            <SuccessContent />
          </Suspense>

          <div className="space-y-4">
            <Link
              href="/account"
              className="block w-full py-3 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl transition-colors"
            >
              Download My Sequences
            </Link>

            <Link
              href="/sequences"
              className="block w-full py-3 bg-surface-light hover:bg-surface-light/80 text-foreground font-semibold rounded-xl border border-border transition-colors"
            >
              Browse More Sequences
            </Link>
          </div>

          <div className="mt-8 pt-8 border-t border-border">
            <h2 className="font-semibold mb-4">What happens next?</h2>
            <ul className="text-sm text-foreground/70 space-y-2 text-left">
              <li className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-green-500 shrink-0 mt-0.5"
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
                <span>Your purchase has been recorded to your account</span>
              </li>
              <li className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-green-500 shrink-0 mt-0.5"
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
                <span>Download links are available in your library</span>
              </li>
              <li className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-green-500 shrink-0 mt-0.5"
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
                <span>A confirmation email will be sent shortly</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
