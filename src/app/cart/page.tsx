"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/contexts/CartContext";

export default function CartPage() {
  const { items, removeItem, clearCart, total, itemCount } = useCart();

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
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl transition-colors"
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
          <button
            onClick={clearCart}
            className="text-sm text-foreground/60 hover:text-foreground transition-colors"
          >
            Clear cart
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-surface rounded-xl border border-border p-4 flex gap-4"
              >
                {/* Thumbnail */}
                <Link
                  href={`/sequences/${item.slug}`}
                  className="shrink-0 w-24 h-24 bg-surface-light rounded-lg overflow-hidden relative"
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
                  <span className="font-bold text-accent">${item.price}</span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-sm text-foreground/60 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-surface rounded-xl border border-border p-6 sticky top-24">
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

              <button
                disabled
                className="w-full py-3 bg-accent/50 text-white font-semibold rounded-xl cursor-not-allowed"
              >
                Checkout Coming Soon
              </button>

              <p className="text-xs text-foreground/50 text-center mt-3">
                Secure checkout with Stripe (coming soon)
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
