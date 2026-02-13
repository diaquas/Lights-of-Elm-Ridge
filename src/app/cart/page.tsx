"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/contexts/CartContext";
import { createClient } from "@/lib/supabase/client";

export default function CartPage() {
  const { items, removeItem, clearCart, total, itemCount } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      if (!supabase) {
        throw new Error("Failed to initialize authentication");
      }

      // Validate the session by checking with Supabase
      // getUser() validates the token server-side, unlike getSession()
      let accessToken: string | null = null;
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (user && !error) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          accessToken = session?.access_token || null;
        }
      } catch {
        // Session invalid, continue as anonymous
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            ...(accessToken && {
              Authorization: `Bearer ${accessToken}`,
            }),
          },
          body: JSON.stringify({
            items: items.map((item) => ({
              id: item.id,
              slug: item.slug,
              title: item.title,
              artist: item.artist,
              price: item.price,
              category: item.category,
            })),
            successUrl: `${window.location.origin}/checkout/success`,
            cancelUrl: `${window.location.origin}/cart`,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (itemCount === 0) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Your Cart</h1>
          <div className="bg-surface rounded-xl border border-border p-12 text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-foreground/60 mb-6">
              Browse our sequences and add some to your cart!
            </p>
            <Link
              href="/sequences"
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-white font-semibold rounded-lg transition-colors"
            >
              Browse Sequences
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Your Cart</h1>
          {showClearConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground/60">
                Clear all items?
              </span>
              <button
                onClick={() => {
                  clearCart();
                  setShowClearConfirm(false);
                }}
                className="text-sm min-h-[44px] min-w-[44px] px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-medium"
              >
                Yes
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="text-sm min-h-[44px] min-w-[44px] px-3 py-2 text-foreground/60 hover:text-foreground hover:bg-surface-light rounded-lg transition-colors"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-sm min-h-[44px] px-3 py-2 text-foreground/60 hover:text-foreground hover:bg-surface-light rounded-lg transition-colors"
            >
              Clear cart
            </button>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-surface rounded-xl border border-border p-3 sm:p-4 flex gap-3 sm:gap-4"
              >
                {/* Thumbnail */}
                <Link
                  href={`/sequences/${item.slug}`}
                  className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-surface-light rounded-lg overflow-hidden relative"
                >
                  {item.thumbnailUrl ? (
                    <Image
                      src={item.thumbnailUrl}
                      alt={`${item.title} - ${item.artist}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl">
                        {item.category === "Halloween" ? "🎃" : "🎄"}
                      </span>
                    </div>
                  )}
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/sequences/${item.slug}`}
                    className="font-semibold hover:text-accent transition-colors line-clamp-1"
                  >
                    {item.title}
                  </Link>
                  <p className="text-sm text-foreground/60">{item.artist}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-surface-light rounded-full border border-border">
                    {item.category}
                  </span>
                </div>

                {/* Price & Remove */}
                <div className="flex flex-col items-end justify-between">
                  <span className="font-bold text-accent text-sm sm:text-base">
                    ${item.price}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-sm min-h-[44px] min-w-[44px] px-3 py-2 text-foreground/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-surface rounded-xl border border-border p-4 sm:p-6 sticky top-20 sm:top-24">
              <h2 className="text-lg font-bold mb-4">Order Summary</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground/60">
                    Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
                  </span>
                  <span>${total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-foreground/60">Tax</span>
                  <span className="text-foreground/60">
                    Calculated at checkout
                  </span>
                </div>
              </div>

              <div className="border-t border-border pt-4 mb-6">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-accent">${total}</span>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={isLoading}
                className="w-full py-3 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    Proceed to Checkout
                  </>
                )}
              </button>

              <p className="text-xs text-foreground/50 text-center mt-3">
                Secure checkout powered by Stripe
              </p>

              <div className="mt-6 pt-6 border-t border-border">
                <Link
                  href="/sequences"
                  className="flex items-center justify-center gap-2 text-sm text-accent hover:text-accent-secondary transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
