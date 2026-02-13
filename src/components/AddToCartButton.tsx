"use client";

import { useCart, CartItem } from "@/contexts/CartContext";
import { showToast } from "@/components/Toast";

interface AddToCartButtonProps {
  sequence: {
    id: number;
    slug: string;
    title: string;
    artist: string;
    price: number;
    category: "Halloween" | "Christmas";
    thumbnailUrl: string | null;
  };
  className?: string;
}

export default function AddToCartButton({
  sequence,
  className = "",
}: AddToCartButtonProps) {
  const { addItem, removeItem, isInCart } = useCart();

  const inCart = isInCart(sequence.id);

  const handleClick = () => {
    if (inCart) {
      removeItem(sequence.id);
    } else {
      const cartItem: CartItem = {
        id: sequence.id,
        slug: sequence.slug,
        title: sequence.title,
        artist: sequence.artist,
        price: sequence.price,
        category: sequence.category,
        thumbnailUrl: sequence.thumbnailUrl,
      };
      addItem(cartItem);
      showToast(`"${sequence.title}" added to cart`);
    }
  };

  if (sequence.price === 0) {
    return null; // Don't show cart button for free items
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center justify-center gap-2 w-full py-4 font-semibold rounded-lg transition-all text-lg ${
        inCart
          ? "bg-green-600 hover:bg-green-700 text-white"
          : "bg-accent hover:bg-accent/90 text-white"
      } ${className}`}
    >
      {inCart ? (
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
              d="M5 13l4 4L19 7"
            />
          </svg>
          Added to Cart
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
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          Add to Cart - ${sequence.price}
        </>
      )}
    </button>
  );
}
