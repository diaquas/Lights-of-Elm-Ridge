"use client";

import { useState, useRef, useEffect } from "react";
import type { Sequence } from "@/data/sequences";
import Link from "next/link";

type Tier = "owned" | "free" | "unowned";

interface SequenceSelectorProps {
  sequences: Sequence[];
  value: string;
  onChange: (slug: string) => void;
  isLoggedIn: boolean;
  isLoading: boolean;
  hasPurchased: (id: number) => boolean;
}

export default function SequenceSelector({
  sequences,
  value,
  onChange,
  isLoggedIn,
  isLoading,
  hasPurchased,
}: SequenceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Group sequences into tiers
  const owned = sequences
    .filter((s) => s.price > 0 && hasPurchased(s.id))
    .sort((a, b) => a.title.localeCompare(b.title));

  const free = sequences
    .filter((s) => s.price === 0)
    .sort((a, b) => a.title.localeCompare(b.title));

  const unowned = sequences
    .filter((s) => s.price > 0 && !hasPurchased(s.id))
    .sort((a, b) => a.title.localeCompare(b.title));

  const selected = sequences.find((s) => s.slug === value);

  function getTier(seq: Sequence): Tier {
    if (seq.price === 0) return "free";
    if (hasPurchased(seq.id)) return "owned";
    return "unowned";
  }

  function handleSelect(slug: string) {
    onChange(slug);
    setIsOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-background border border-border rounded-lg px-4 py-3 text-left text-foreground focus:outline-none focus:ring-2 focus:ring-accent flex items-center justify-between"
      >
        {selected ? (
          <span className="flex items-center gap-2 truncate">
            <TierIcon tier={getTier(selected)} />
            <span className="truncate">
              {selected.title} — {selected.artist}
            </span>
          </span>
        ) : (
          <span className="text-foreground/50">Choose a sequence...</span>
        )}
        <svg
          className={`w-4 h-4 text-foreground/40 flex-shrink-0 ml-2 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-background border border-border rounded-lg shadow-xl max-h-[28rem] overflow-y-auto">
          {/* YOUR SEQUENCES */}
          {isLoggedIn && owned.length > 0 && (
            <div>
              <SectionHeader label="YOUR SEQUENCES" />
              {owned.map((seq) => (
                <SequenceItem
                  key={seq.slug}
                  seq={seq}
                  tier="owned"
                  isSelected={value === seq.slug}
                  onClick={() => handleSelect(seq.slug)}
                />
              ))}
            </div>
          )}

          {/* FREE SEQUENCES */}
          {free.length > 0 && (
            <div>
              <SectionHeader label="FREE SEQUENCES" />
              {free.map((seq) => (
                <SequenceItem
                  key={seq.slug}
                  seq={seq}
                  tier="free"
                  isSelected={value === seq.slug}
                  onClick={() => handleSelect(seq.slug)}
                />
              ))}
            </div>
          )}

          {/* MORE / ALL SEQUENCES */}
          {unowned.length > 0 && (
            <div className="border-t border-zinc-800">
              <SectionHeader
                label={isLoggedIn ? "MORE SEQUENCES" : "ALL SEQUENCES"}
              />
              {unowned.map((seq) => (
                <SequenceItem
                  key={seq.slug}
                  seq={seq}
                  tier="unowned"
                  isSelected={value === seq.slug}
                  onClick={() => handleSelect(seq.slug)}
                />
              ))}
            </div>
          )}

          {/* Edge case: user owns everything */}
          {isLoggedIn && owned.length > 0 && unowned.length === 0 && (
            <div className="px-4 py-3 border-t border-zinc-800 text-center">
              <p className="text-sm text-foreground/50">
                You own every sequence!
              </p>
            </div>
          )}

          {/* Browse all sequences link */}
          <div className="px-4 py-3 text-center border-t border-zinc-800/50">
            <Link
              href="/sequences"
              className="text-sm text-red-400 hover:text-red-300 inline-flex items-center gap-1"
            >
              <span>&darr;</span> Browse all sequences
            </Link>
          </div>

          {/* Login nudge */}
          {!isLoggedIn && !isLoading && (
            <div className="px-4 pb-3 text-center">
              <Link
                href="/login?redirect=/modiq"
                className="text-xs text-zinc-500 hover:text-zinc-400"
              >
                Log in to see your purchased sequences
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-4 pt-3 pb-1">
      <span className="text-xs tracking-widest text-zinc-500 font-medium uppercase">
        {label}
      </span>
    </div>
  );
}

function TierIcon({ tier }: { tier: Tier }) {
  if (tier === "owned") {
    return (
      <span className="text-green-400 text-sm flex-shrink-0">&check;</span>
    );
  }
  if (tier === "free") {
    return <span className="text-red-400 text-sm flex-shrink-0">&starf;</span>;
  }
  return <span className="text-zinc-500 text-sm flex-shrink-0">&#9675;</span>;
}

function SequenceItem({
  seq,
  tier,
  isSelected,
  onClick,
}: {
  seq: Sequence;
  tier: Tier;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full px-4 py-2 flex items-center gap-2 text-left transition-colors hover:bg-surface-light ${
        isSelected ? "bg-surface-light" : ""
      } ${tier === "unowned" ? "opacity-75" : ""}`}
    >
      <TierIcon tier={tier} />
      <span className="text-sm text-foreground truncate flex-1">
        {seq.title}
        <span className="text-foreground/50"> — {seq.artist}</span>
      </span>
      {tier === "free" && (
        <span className="text-[10px] tracking-wider font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded flex-shrink-0">
          FREE
        </span>
      )}
      {tier === "unowned" && (
        <span className="text-xs text-foreground/40 flex-shrink-0">
          ${seq.price.toFixed(2)}
        </span>
      )}
    </button>
  );
}
