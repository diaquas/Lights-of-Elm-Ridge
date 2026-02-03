"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/contexts/CartContext";

export default function CartDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { items, removeItem, total, itemCount } = useCart();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Cart Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-all ${
          isOpen
            ? "bg-accent/20 text-accent"
            : "text-foreground/70 hover:text-foreground hover:bg-surface-light"
        }`}
        aria-label={`Shopping cart${itemCount > 0 ? `, ${itemCount} items` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
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
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-accent text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {itemCount > 9 ? "9+" : itemCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-32px)] bg-surface rounded-xl border border-border shadow-lg overflow-hidden z-50">
          {itemCount === 0 ? (
            <div className="p-6 text-center">
              <div className="text-4xl mb-2">🛒</div>
              <p className="text-foreground/60 text-sm">Your cart is empty</p>
            </div>
          ) : (
            <>
              {/* Items */}
              <div className="max-h-72 overflow-y-auto">
                {items.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 p-3 border-b border-border last:border-0"
                  >
                    {/* Thumbnail */}
                    <Link
                      href={`/sequences/${item.slug}`}
                      onClick={() => setIsOpen(false)}
                      className="shrink-0 w-12 h-12 bg-surface-light rounded-lg overflow-hidden relative"
                    >
                      {item.thumbnailUrl ? (
                        <Image
                          src={item.thumbnailUrl}
                          alt={item.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xl">
                            {item.category === "Halloween" ? "🎃" : "🎄"}
                          </span>
                        </div>
                      )}
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/sequences/${item.slug}`}
                        onClick={() => setIsOpen(false)}
                        className="text-sm font-medium hover:text-accent transition-colors line-clamp-1"
                      >
                        {item.title}
                      </Link>
                      <p className="text-xs text-foreground/60">
                        {item.artist}
                      </p>
                    </div>

                    {/* Price & Remove */}
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-semibold text-accent">
                        ${item.price}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-xs px-1 py-0.5 text-foreground/50 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}

                {items.length > 5 && (
                  <div className="p-3 text-center text-sm text-foreground/60 border-t border-border">
                    +{items.length - 5} more item
                    {items.length - 5 > 1 ? "s" : ""}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-surface-light border-t border-border">
                <div className="flex justify-between mb-3">
                  <span className="text-sm text-foreground/60">Subtotal</span>
                  <span className="font-bold text-accent">${total}</span>
                </div>
                <Link
                  href="/cart"
                  onClick={() => setIsOpen(false)}
                  className="block w-full py-2 bg-accent hover:bg-accent/90 text-white text-center font-semibold rounded-lg transition-colors"
                >
                  View Cart
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
