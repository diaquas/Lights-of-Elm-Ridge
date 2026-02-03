"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Song } from "@/data/songlist";
import { sequences } from "@/data/sequences";

interface PlaylistTabsProps {
  halloweenSongs: Song[];
  christmasSongs: Song[];
  newFor2026: Song[];
}

// Helper to get the wide thumbnail from sequences data
function getWideThumbnail(sequenceSlug: string | undefined): string | null {
  if (!sequenceSlug) return null;
  const sequence = sequences.find((s) => s.slug === sequenceSlug);
  return sequence?.thumbnailUrl || null;
}

// Chevron icon for internal links
function ChevronIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// External link icon for vendor links
function ExternalLinkIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// Play icon for thumbnail hover
function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="#fff">
      <path d="M3 1.5L12 7L3 12.5V1.5Z" />
    </svg>
  );
}

function TrackRow({ song, trackNum }: { song: Song; trackNum: number }) {
  // Determine the link destination
  const href =
    song.isOriginal && song.sequenceSlug
      ? `/sequences/${song.sequenceSlug}`
      : song.vendorUrl || "#";

  const isExternal = !song.isOriginal && song.vendorUrl;
  const hasLink = (song.isOriginal && song.sequenceSlug) || song.vendorUrl;

  // Get thumbnail: prefer wide thumbnailUrl from sequences, then imageUrl, then YouTube
  const wideThumbnail = getWideThumbnail(song.sequenceSlug);
  const thumbnailUrl =
    wideThumbnail ||
    song.imageUrl ||
    (song.youtubeId
      ? `https://img.youtube.com/vi/${song.youtubeId}/mqdefault.jpg`
      : null);

  const isNew = song.yearAdded === 2026;

  const TrackContent = (
    <>
      <span className="track-num">{trackNum}</span>
      <div className="track-thumb">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt=""
            width={88}
            height={88}
            className="object-cover"
            loading="lazy"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--seq-surface-raised)] to-[var(--seq-surface)]" />
        )}
        <div className="track-thumb-play" aria-hidden="true">
          <PlayIcon />
        </div>
      </div>
      <div className="track-info">
        <span className="track-title">{song.title}</span>
        <span className="track-artist">{song.artist}</span>
      </div>
      <div className="track-badges">
        {isNew && <span className="track-badge track-badge-new">New</span>}
        {song.isOriginal ? (
          <span className="track-badge track-badge-original">Original</span>
        ) : (
          <span className="track-badge track-badge-vendor">{song.vendor}</span>
        )}
      </div>
      <span className="track-action">
        {isExternal ? <ExternalLinkIcon /> : <ChevronIcon />}
      </span>
    </>
  );

  if (!hasLink) {
    return <div className="track">{TrackContent}</div>;
  }

  if (isExternal) {
    return (
      <a
        href={href}
        className="track"
        target="_blank"
        rel="noopener noreferrer"
      >
        {TrackContent}
      </a>
    );
  }

  return (
    <Link href={href} className="track">
      {TrackContent}
    </Link>
  );
}

export default function PlaylistTabs({
  halloweenSongs,
  christmasSongs,
  newFor2026,
}: PlaylistTabsProps) {
  const [activeTab, setActiveTab] = useState<"halloween" | "christmas">(
    "halloween",
  );

  const halloweenNew = newFor2026.filter((s) => s.category === "Halloween");
  const christmasNew = newFor2026.filter((s) => s.category === "Christmas");
  const currentNew = activeTab === "halloween" ? halloweenNew : christmasNew;
  const currentSongs =
    activeTab === "halloween" ? halloweenSongs : christmasSongs;

  const halloweenOriginals = halloweenSongs.filter((s) => s.isOriginal).length;
  const christmasOriginals = christmasSongs.filter((s) => s.isOriginal).length;
  const currentOriginals =
    activeTab === "halloween" ? halloweenOriginals : christmasOriginals;

  return (
    <>
      {/* Header Bottom: Category tabs + original count */}
      <div className="playlist-header-bottom seq-anim-in seq-delay-2">
        {/* Category tabs */}
        <div className="seq-category-tabs" role="tablist">
          <button
            className={`seq-cat-tab ${activeTab === "halloween" ? "active" : ""}`}
            role="tab"
            aria-selected={activeTab === "halloween"}
            onClick={() => setActiveTab("halloween")}
          >
            <span className="seq-cat-tab-icon">🎃</span>
            Halloween
            <span className="seq-cat-tab-count">({halloweenSongs.length})</span>
            {halloweenNew.length > 0 && (
              <span className="seq-cat-tab-new">{halloweenNew.length} new</span>
            )}
          </button>
          <button
            className={`seq-cat-tab ${activeTab === "christmas" ? "active" : ""}`}
            role="tab"
            aria-selected={activeTab === "christmas"}
            onClick={() => setActiveTab("christmas")}
          >
            <span className="seq-cat-tab-icon">🎄</span>
            Christmas
            <span className="seq-cat-tab-count">({christmasSongs.length})</span>
            {christmasNew.length > 0 && (
              <span className="seq-cat-tab-new">{christmasNew.length} new</span>
            )}
          </button>
        </div>

        <span className="playlist-original-count">
          <strong>{currentOriginals}</strong> original / {currentSongs.length}{" "}
          total in {activeTab === "halloween" ? "Halloween" : "Christmas"}
        </span>
      </div>

      {/* Content area */}
      <main className="playlist-main">
        {/* New for 2026 Section (filtered by active tab) */}
        {currentNew.length > 0 && (
          <section>
            <div className="playlist-section-header seq-anim-in seq-delay-3">
              <div className="playlist-section-title-group">
                <span className="playlist-section-icon">✨</span>
                <h2 className="playlist-section-title">New for 2026</h2>
                <span className="playlist-section-meta">
                  {currentNew.length} songs
                </span>
              </div>
              <span className="seq-section-count">{currentNew.length} new</span>
            </div>

            <div className="tracklist seq-anim-in seq-delay-3">
              {currentNew.map((song, index) => (
                <TrackRow key={song.id} song={song} trackNum={index + 1} />
              ))}
            </div>
          </section>
        )}

        {/* Main Songs Section */}
        <section>
          <div className="playlist-section-header seq-anim-in seq-delay-4">
            <div className="playlist-section-title-group">
              <span className="playlist-section-icon">
                {activeTab === "halloween" ? "🎃" : "🎄"}
              </span>
              <h2 className="playlist-section-title">
                {activeTab === "halloween" ? "Halloween" : "Christmas"}
              </h2>
              <span className="playlist-section-meta">
                {currentOriginals} original / {currentSongs.length} total
              </span>
            </div>
          </div>

          <div className="tracklist seq-anim-in seq-delay-4">
            {currentSongs.map((song, index) => (
              <TrackRow key={song.id} song={song} trackNum={index + 1} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
