"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Sequence } from "@/data/sequences";
import { getMockupVideoId } from "@/data/youtube-loader";
import { usePurchasedSequences } from "@/hooks/usePurchasedSequences";

interface SequenceTabsProps {
  halloweenSequences: Sequence[];
  christmasSequences: Sequence[];
  newFor2026: Sequence[];
}

type DifficultyFilter = "all" | "Beginner" | "Intermediate" | "Advanced";
type PriceFilter = "all" | "free" | "paid";
type OwnershipFilter = "all" | "owned" | "not-owned";

// Helper to render sequence dominant color chips
function ColorDots({ colors }: { colors: string[] }) {
  if (!colors || colors.length === 0) return null;
  return (
    <span className="seq-card-dots">
      {colors.slice(0, 3).map((color, i) => (
        <span
          key={i}
          className="seq-card-dot"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  );
}

function SequenceCard({
  sequence,
  isPurchased,
  animationDelay,
}: {
  sequence: Sequence;
  isPurchased: boolean;
  animationDelay?: number;
}) {
  // Check for mockup video from YouTube playlist (dynamic) or sequence data (static)
  const mockupVideoId = getMockupVideoId(sequence.slug);
  const hasVideo = !!mockupVideoId || !!sequence.youtubeId;

  // Priority for thumbnail: custom > mockup from YouTube > hardcoded youtubeId
  const thumbnailUrl =
    sequence.thumbnailUrl ||
    (mockupVideoId
      ? `https://img.youtube.com/vi/${mockupVideoId}/maxresdefault.jpg`
      : sequence.youtubeId
        ? `https://img.youtube.com/vi/${sequence.youtubeId}/maxresdefault.jpg`
        : undefined);

  const isNew = sequence.yearAdded === 2026;
  const isHalloween = sequence.category === "Halloween";
  const isFree = sequence.price === 0;

  // Animation class
  const animClass =
    animationDelay !== undefined
      ? `seq-anim-in seq-delay-${Math.min(animationDelay, 9)}`
      : "";

  return (
    <Link
      href={`/sequences/${sequence.slug}`}
      className={`seq-card ${animClass}`}
    >
      <div className="seq-card-image">
        {/* Background image */}
        {thumbnailUrl && (
          <Image
            src={thumbnailUrl}
            alt={sequence.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            loading="lazy"
            unoptimized
          />
        )}

        {hasVideo ? (
          // Ready sequence - show preview badge and NEW badge
          <>
            {/* Watch Preview badge - top left (unless owned) */}
            {!isPurchased && (
              <span className="seq-card-preview-badge">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 12 12"
                  fill="currentColor"
                >
                  <path d="M2.5 1.5L10.5 6L2.5 10.5V1.5Z" />
                </svg>
                Watch Preview
              </span>
            )}

            {/* Owned badge - top left */}
            {isPurchased && (
              <span className="seq-card-owned-badge">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Owned
              </span>
            )}

            {/* NEW badge - bottom left */}
            {isNew && <span className="seq-card-new-badge">✨ New 2026</span>}
          </>
        ) : (
          // Coming soon overlay
          <div className="seq-card-coming-soon">
            <span className="seq-card-coming-soon-icon">
              {isHalloween ? "👻" : "🎅"}
            </span>
            <span className="seq-card-coming-soon-label">Coming Soon</span>
            <span className="seq-card-coming-soon-sub">
              Preview in the works
            </span>
          </div>
        )}

        {/* Price badge - top right */}
        <span className={`seq-card-price ${isFree ? "free" : ""}`}>
          {isFree ? "Free" : `$${sequence.price}`}
        </span>
      </div>

      <div className="seq-card-body">
        <div className="seq-card-title-row">
          <span className="seq-card-title">{sequence.title}</span>
          {isNew && <span className="seq-card-new-inline">New</span>}
          <ColorDots colors={sequence.dominantColors} />
        </div>
        <div className="seq-card-artist">{sequence.artist}</div>
        <div className="seq-card-desc">{sequence.description}</div>
        <div className="seq-card-meta">
          <span className="seq-card-meta-item">{sequence.duration}</span>
          <span className="seq-card-meta-item">{sequence.difficulty}</span>
        </div>
      </div>
    </Link>
  );
}

export default function SequenceTabs({
  halloweenSequences,
  christmasSequences,
  newFor2026,
}: SequenceTabsProps) {
  const [activeTab, setActiveTab] = useState<"halloween" | "christmas">(
    "halloween",
  );
  const [showAllNew, setShowAllNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] =
    useState<DifficultyFilter>("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [ownershipFilter, setOwnershipFilter] =
    useState<OwnershipFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Get purchased sequences for logged-in users
  const { purchasedIds, isLoggedIn, hasPurchased } = usePurchasedSequences();

  const halloweenNew = newFor2026.filter((s) => s.category === "Halloween");
  const christmasNew = newFor2026.filter((s) => s.category === "Christmas");
  const currentNew = activeTab === "halloween" ? halloweenNew : christmasNew;

  // Exclude "New for 2026" sequences from the main grid to avoid duplicates
  // They're already shown in the dedicated "New for 2026" section
  const newSequenceIds = new Set(newFor2026.map((s) => s.id));
  const baseSequences = (
    activeTab === "halloween" ? halloweenSequences : christmasSequences
  ).filter((s) => !newSequenceIds.has(s.id));

  // Calculate stats
  const freeCount = (
    activeTab === "halloween" ? halloweenSequences : christmasSequences
  ).filter((s) => s.price === 0).length;
  const premiumCount = (
    activeTab === "halloween" ? halloweenSequences : christmasSequences
  ).filter((s) => s.price > 0).length;

  // Filter sequences based on search and filters
  const currentSequences = useMemo(() => {
    let filtered = baseSequences;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.artist.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    // Difficulty filter
    if (difficultyFilter !== "all") {
      filtered = filtered.filter((s) => s.difficulty === difficultyFilter);
    }

    // Price filter
    if (priceFilter === "free") {
      filtered = filtered.filter((s) => s.price === 0);
    } else if (priceFilter === "paid") {
      filtered = filtered.filter((s) => s.price > 0);
    }

    // Ownership filter (only applies when logged in)
    if (ownershipFilter === "owned") {
      filtered = filtered.filter((s) => purchasedIds.has(s.id));
    } else if (ownershipFilter === "not-owned") {
      filtered = filtered.filter((s) => !purchasedIds.has(s.id));
    }

    return filtered;
  }, [
    baseSequences,
    searchQuery,
    difficultyFilter,
    priceFilter,
    ownershipFilter,
    purchasedIds,
  ]);

  const hasActiveFilters =
    searchQuery.trim() ||
    difficultyFilter !== "all" ||
    priceFilter !== "all" ||
    ownershipFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setDifficultyFilter("all");
    setPriceFilter("all");
    setOwnershipFilter("all");
  };

  // Show first 3, or all if expanded
  const visibleNew = showAllNew ? currentNew : currentNew.slice(0, 3);
  const hasMoreNew = currentNew.length > 3;

  return (
    <>
      {/* Header Top: Title + Search */}
      <div className="seq-header-top seq-anim-in seq-delay-1">
        <div className="seq-header-title-group">
          <h1 className="seq-page-title font-display">
            <span className="accent-text">xLights</span> Sequences
          </h1>
          <p className="seq-page-subtitle">
            Professionally sequenced, obsessively tested, ready to run.
          </p>
        </div>
        <div className="seq-search-bar">
          <svg
            className="search-icon"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by title, artist, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--seq-text-tertiary)] hover:text-[var(--seq-text-primary)] transition-colors"
              aria-label="Clear search"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Header Bottom: Tabs + Stats + Filters */}
      <div className="seq-header-bottom seq-anim-in seq-delay-2">
        {/* Category tabs */}
        <div className="seq-category-tabs" role="tablist">
          <button
            className={`seq-cat-tab ${activeTab === "halloween" ? "active" : ""}`}
            role="tab"
            aria-selected={activeTab === "halloween"}
            onClick={() => {
              setActiveTab("halloween");
              setShowAllNew(false);
            }}
          >
            <span className="seq-cat-tab-icon">🎃</span>
            Halloween
            <span className="seq-cat-tab-count">
              ({halloweenSequences.length})
            </span>
            {halloweenNew.length > 0 && (
              <span className="seq-cat-tab-new">{halloweenNew.length} new</span>
            )}
          </button>
          <button
            className={`seq-cat-tab ${activeTab === "christmas" ? "active" : ""}`}
            role="tab"
            aria-selected={activeTab === "christmas"}
            onClick={() => {
              setActiveTab("christmas");
              setShowAllNew(false);
            }}
          >
            <span className="seq-cat-tab-icon">🎄</span>
            Christmas
            <span className="seq-cat-tab-count">
              ({christmasSequences.length})
            </span>
            {christmasNew.length > 0 && (
              <span className="seq-cat-tab-new">{christmasNew.length} new</span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="seq-stat-badges">
            {freeCount > 0 && (
              <span className="seq-stat-badge free">{freeCount} Free</span>
            )}
            <span className="seq-stat-badge premium">
              {premiumCount} Premium
            </span>
          </div>
          <button
            className="seq-filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filters
            {hasActiveFilters && (
              <span className="seq-cat-tab-new ml-1">Active</span>
            )}
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 p-3 sm:p-4 mx-4 sm:mx-0 mt-4 bg-[var(--seq-surface)] rounded-xl border border-[var(--seq-surface-border)]">
          {/* Difficulty Filter */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <label className="text-xs sm:text-sm text-[var(--seq-text-tertiary)]">
              Difficulty:
            </label>
            <select
              value={difficultyFilter}
              onChange={(e) =>
                setDifficultyFilter(e.target.value as DifficultyFilter)
              }
              className="px-2 sm:px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 bg-[var(--seq-surface-raised)] border border-[var(--seq-surface-border)] rounded-lg text-xs sm:text-sm text-[var(--seq-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/50"
            >
              <option value="all">All</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          {/* Price Filter */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <label className="text-xs sm:text-sm text-[var(--seq-text-tertiary)]">
              Price:
            </label>
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value as PriceFilter)}
              className="px-2 sm:px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 bg-[var(--seq-surface-raised)] border border-[var(--seq-surface-border)] rounded-lg text-xs sm:text-sm text-[var(--seq-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/50"
            >
              <option value="all">All</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {/* Ownership Filter - only show when logged in */}
          {isLoggedIn && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <label className="text-xs sm:text-sm text-[var(--seq-text-tertiary)]">
                Ownership:
              </label>
              <select
                value={ownershipFilter}
                onChange={(e) =>
                  setOwnershipFilter(e.target.value as OwnershipFilter)
                }
                className="px-2 sm:px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 bg-[var(--seq-surface-raised)] border border-[var(--seq-surface-border)] rounded-lg text-xs sm:text-sm text-[var(--seq-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#ef4444]/50"
              >
                <option value="all">All</option>
                <option value="owned">Owned</option>
                <option value="not-owned">Not Owned</option>
              </select>
            </div>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 text-xs sm:text-sm text-[#ef4444] hover:text-[#ef4444]/80 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Content area */}
      <div className="seq-content">
        {/* New for 2026 Section (filtered by active tab) */}
        {currentNew.length > 0 && (
          <section>
            <div className="seq-section-header seq-anim-in seq-delay-3">
              <div className="seq-section-title-group">
                <span className="seq-section-icon">✨</span>
                <h2 className="seq-section-title">New for 2026</h2>
                <span className="seq-section-subtitle">
                  Fresh {activeTab} sequences added this season
                </span>
              </div>
              <span className="seq-section-count">{currentNew.length} new</span>
            </div>

            <div className="seq-card-grid">
              {visibleNew.map((sequence, index) => (
                <SequenceCard
                  key={sequence.id}
                  sequence={sequence}
                  isPurchased={hasPurchased(sequence.id)}
                  animationDelay={4 + index}
                />
              ))}
            </div>

            {/* Show More/Less Button */}
            {hasMoreNew && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowAllNew(!showAllNew)}
                  className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 min-h-[44px] bg-[var(--seq-surface)] hover:bg-[var(--seq-surface-raised)] border border-[var(--seq-surface-border)] rounded-xl text-sm sm:text-base text-[var(--seq-text-secondary)] hover:text-[var(--seq-text-primary)] transition-colors"
                >
                  {showAllNew ? (
                    <>
                      Show Less
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
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    </>
                  ) : (
                    <>
                      Show {currentNew.length - 3} More
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
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            )}
          </section>
        )}

        {/* Main Sequences Grid */}
        <section>
          <div className="seq-section-header seq-anim-in seq-delay-7">
            <div className="seq-section-title-group">
              <span className="seq-section-icon">
                {activeTab === "halloween" ? "🎃" : "🎄"}
              </span>
              <h2 className="seq-section-title">
                {activeTab === "halloween" ? "Halloween" : "Christmas"}{" "}
                Sequences
              </h2>
              {hasActiveFilters && (
                <span className="seq-section-subtitle">
                  Showing {currentSequences.length} of {baseSequences.length}
                </span>
              )}
            </div>
          </div>

          {currentSequences.length > 0 ? (
            <div className="seq-card-grid">
              {currentSequences.map((sequence, index) => (
                <SequenceCard
                  key={sequence.id}
                  sequence={sequence}
                  isPurchased={hasPurchased(sequence.id)}
                  animationDelay={8 + (index % 3)}
                />
              ))}
            </div>
          ) : hasActiveFilters ? (
            <div className="bg-[var(--seq-surface)] rounded-xl p-8 border border-[var(--seq-surface-border)] text-center">
              <span className="text-6xl block mb-4">🔍</span>
              <h3 className="text-xl font-semibold mb-2 text-[var(--seq-text-primary)]">
                No Sequences Found
              </h3>
              <p className="text-[var(--seq-text-tertiary)] max-w-md mx-auto mb-4">
                No sequences match your current filters. Try adjusting your
                search or filters.
              </p>
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-[#ef4444] hover:bg-[#ef4444]/80 text-white rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="bg-[var(--seq-surface)] rounded-xl p-8 border border-[var(--seq-surface-border)] text-center">
              <span className="text-6xl block mb-4">🎅</span>
              <h3 className="text-xl font-semibold mb-2 text-[var(--seq-text-primary)]">
                Coming This Fall
              </h3>
              <p className="text-[var(--seq-text-tertiary)] max-w-md mx-auto">
                Christmas sequences are in production and will be available
                before the season starts. Check back soon!
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
