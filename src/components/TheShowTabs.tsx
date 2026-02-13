"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Song } from "@/data/songlist";
import type { YouTubeVideo } from "@/data/youtube-config";
import { sequences } from "@/data/sequences";
import LayoutExplorer from "@/components/LayoutExplorer";

interface VideoGroup {
  year: number;
  videos: YouTubeVideo[];
  playlistId: string;
}

interface TheShowTabsProps {
  videoGroups: VideoGroup[];
  halloweenSongs: Song[];
  christmasSongs: Song[];
  vendors: { name: string; url: string; count: number }[];
  displayStats: {
    totalPixels: string;
    controllers: string;
    fmStation: string;
  };
}

// Icons
function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 14 14" fill="#fff">
      <path d="M3.5 1.5L11.5 7L3.5 12.5V1.5Z" />
    </svg>
  );
}

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

function YouTubeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

// Helper to get thumbnail from sequences data
function getWideThumbnail(sequenceSlug: string | undefined): string | null {
  if (!sequenceSlug) return null;
  const sequence = sequences.find((s) => s.slug === sequenceSlug);
  return sequence?.thumbnailUrl || null;
}

// Parse YouTube title to extract song name and artist
function parseVideoTitle(title: string): { songName: string; artist: string } {
  // Remove common suffixes like "- xLights", "- Light Show", "- Mockup", etc.
  const cleaned = title
    .replace(
      /\s*[-–—]\s*(xlights|mockup|mock up|preview|demo|test|sequence|light show|lights?|display|2024|2025).*$/i,
      "",
    )
    .replace(/\s*\(xlights.*?\)/gi, "")
    .replace(/\s*\[xlights.*?\]/gi, "")
    .replace(/\s*\|.*$/i, "")
    .trim();

  // Try to extract "Song by Artist" format
  const byMatch = cleaned.match(/^(.+?)\s+by\s+(.+)$/i);
  if (byMatch) {
    return {
      songName: byMatch[1].trim(),
      artist: byMatch[2].trim(),
    };
  }

  // Try "Song - Artist" format (if there's a dash separator)
  const dashMatch = cleaned.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch) {
    return {
      songName: dashMatch[1].trim(),
      artist: dashMatch[2].trim(),
    };
  }

  // Fallback: just use the cleaned title as song name
  return {
    songName: cleaned,
    artist: "",
  };
}

// Video Card Component
function VideoCard({ video }: { video: YouTubeVideo }) {
  const { songName, artist } = parseVideoTitle(video.title);

  return (
    <a
      href={`https://www.youtube.com/watch?v=${video.id}`}
      className="video-card"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="video-card-thumb">
        <img src={video.thumbnailUrl} alt="" loading="lazy" />
        <div className="video-card-play">
          <div className="video-card-play-icon">
            <PlayIcon />
          </div>
        </div>
      </div>
      <div className="video-card-body">
        <div className="video-card-title">{songName}</div>
        <div className="video-card-artist">{artist}</div>
      </div>
    </a>
  );
}

// Track Row Component for Playlist
function TrackRow({ song, trackNum }: { song: Song; trackNum: number }) {
  const href =
    song.isOriginal && song.sequenceSlug
      ? `/sequences/${song.sequenceSlug}`
      : song.vendorUrl || "#";

  const isExternal = !song.isOriginal && song.vendorUrl;
  const hasLink = (song.isOriginal && song.sequenceSlug) || song.vendorUrl;

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
          <svg width="14" height="14" viewBox="0 0 14 14" fill="#fff">
            <path d="M3 1.5L12 7L3 12.5V1.5Z" />
          </svg>
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

export default function TheShowTabs({
  videoGroups,
  halloweenSongs,
  christmasSongs,
  vendors,
  displayStats,
}: TheShowTabsProps) {
  // Main tab state
  const [activeTab, setActiveTab] = useState<"watch" | "playlist" | "display">(
    "display",
  );

  // Tech stack collapsible state
  const [techStackOpen, setTechStackOpen] = useState(false);

  // Playlist category tab state
  const [playlistCategory, setPlaylistCategory] = useState<
    "halloween" | "christmas"
  >("halloween");

  // Handle URL hash on mount and changes
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace("#", "");
      const validTabs = ["watch", "playlist", "display"];
      if (validTabs.includes(hash)) {
        setActiveTab(hash as "watch" | "playlist" | "display");
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Update URL hash when tab changes
  const switchTab = (tab: "watch" | "playlist" | "display") => {
    setActiveTab(tab);
    window.history.replaceState(null, "", `#${tab}`);
  };

  // Playlist data
  const currentSongs =
    playlistCategory === "halloween" ? halloweenSongs : christmasSongs;
  const halloweenOriginals = halloweenSongs.filter((s) => s.isOriginal).length;
  const christmasOriginals = christmasSongs.filter((s) => s.isOriginal).length;
  const currentOriginals =
    playlistCategory === "halloween" ? halloweenOriginals : christmasOriginals;

  const totalSongs = halloweenSongs.length + christmasSongs.length;
  const videoCount = videoGroups.reduce((acc, g) => acc + g.videos.length, 0);

  return (
    <>
      {/* Tab Bar */}
      <div className="show-tab-bar-wrapper seq-anim-in seq-delay-2">
        <div className="show-tab-bar" role="tablist">
          <button
            className={`show-tab-btn ${activeTab === "display" ? "active" : ""}`}
            role="tab"
            aria-selected={activeTab === "display"}
            onClick={() => switchTab("display")}
          >
            <span className="show-tab-btn-icon">⌂</span> The Display
          </button>
          <button
            className={`show-tab-btn ${activeTab === "watch" ? "active" : ""}`}
            role="tab"
            aria-selected={activeTab === "watch"}
            onClick={() => switchTab("watch")}
          >
            <span className="show-tab-btn-icon">▶</span> Watch
            <span className="show-tab-btn-count">{videoCount} videos</span>
          </button>
          <button
            className={`show-tab-btn ${activeTab === "playlist" ? "active" : ""}`}
            role="tab"
            aria-selected={activeTab === "playlist"}
            onClick={() => switchTab("playlist")}
          >
            <span className="show-tab-btn-icon">♫</span> Playlist
            <span className="show-tab-btn-count">{totalSongs} songs</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TAB 1: THE DISPLAY — Interactive explorer + tech specs
          ═══════════════════════════════════════════════════════════ */}
      <div
        id="display"
        className={`show-tab-panel ${activeTab === "display" ? "active" : ""}`}
        role="tabpanel"
      >
        {/* Stat row */}
        <div className="display-stats">
          <div className="display-stat">
            <div className="display-stat-num">{displayStats.totalPixels}</div>
            <div className="display-stat-label">Total Pixels</div>
          </div>
          <div className="display-stat">
            <div className="display-stat-num">{displayStats.controllers}</div>
            <div className="display-stat-label">Controllers</div>
          </div>
          <div className="display-stat">
            <div className="display-stat-num">{displayStats.fmStation}</div>
            <div className="display-stat-label">FM Station</div>
          </div>
        </div>

        {/* Interactive Layout Explorer */}
        <LayoutExplorer />

        {/* Tech Stack — collapsible */}
        <div className={`tech-stack ${techStackOpen ? "open" : ""}`}>
          <button
            className="tech-stack-toggle"
            onClick={() => setTechStackOpen(!techStackOpen)}
            aria-expanded={techStackOpen}
          >
            <div className="tech-stack-toggle-left">
              <span className="tech-stack-icon">⚡</span>
              <span className="tech-stack-title">Under the Hood</span>
            </div>
            <svg
              className="tech-stack-chevron"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <div className="tech-stack-body">
            <div className="tech-stack-rows">
              <div className="tech-stack-row">
                <span className="tech-stack-label">Network</span>
                <span className="tech-stack-detail">
                  E1.31 protocol · 190 universes · 510 channels each
                </span>
              </div>
              <div className="tech-stack-row">
                <span className="tech-stack-label">Power</span>
                <span className="tech-stack-detail">
                  Multiple Mean Well 12V supplies · power injection every 150px
                  · dedicated 20A circuits
                </span>
              </div>
              <div className="tech-stack-row">
                <span className="tech-stack-label">Show Player</span>
                <span className="tech-stack-detail">
                  xSchedule + Remote Falcon (viewer song requests) · FM 87.9
                </span>
              </div>
              <div className="tech-stack-row">
                <span className="tech-stack-label">Pixels</span>
                <span className="tech-stack-detail">
                  WS2811 bullet nodes (12mm) + WS2812B strips · all IP67
                  outdoor-rated
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Shopping List Wizard CTA */}
        <div className="display-cta">
          <div className="display-cta-text">
            <strong>Want to build something like this?</strong> Tell us about
            your space and we&apos;ll generate a custom shopping list.
          </div>
          <Link href="/build-your-show" className="btn-primary">
            Try the Shopping List Wizard →
          </Link>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TAB 2: WATCH — Video gallery by season
          ═══════════════════════════════════════════════════════════ */}
      <div
        id="watch"
        className={`show-tab-panel ${activeTab === "watch" ? "active" : ""}`}
        role="tabpanel"
      >
        {videoGroups.map((group, groupIndex) => (
          <div key={group.year}>
            <div
              className={`season-header seq-anim-in seq-delay-${Math.min(groupIndex + 3, 6)}`}
            >
              <div className="season-title-group">
                <span className="season-icon">🏠</span>
                <h2 className="season-title">{group.year} Season</h2>
                <span className="season-meta">
                  {group.videos.length} videos
                </span>
              </div>
              <a
                href={`https://www.youtube.com/playlist?list=${group.playlistId}`}
                className="season-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                View playlist ↗
              </a>
            </div>

            <div
              className={`video-grid seq-anim-in seq-delay-${Math.min(groupIndex + 3, 6)}`}
            >
              {group.videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          </div>
        ))}

        {/* Behind the Scenes teaser */}
        <div className="bts-teaser seq-anim-in seq-delay-5">
          <div className="bts-teaser-title">🎬 Behind the Scenes</div>
          <p className="bts-teaser-desc">
            Setup timelapses, tutorials, and the nerdy details you didn&apos;t
            know you needed. Coming soon.
          </p>
          <Link href="/behind-the-scenes" className="btn-sm">
            Get notified →
          </Link>
        </div>

        {/* Subscribe CTA */}
        <div className="subscribe-bar seq-anim-in seq-delay-6">
          <div className="subscribe-bar-text">
            Don&apos;t miss a show{" "}
            <span>— new footage as we build and grow the display</span>
          </div>
          <a
            href="https://www.youtube.com/channel/UCKvEDoz59mtUv2UCuJq6vuA"
            className="btn-yt"
            target="_blank"
            rel="noopener noreferrer"
          >
            <YouTubeIcon />
            Subscribe on YouTube
          </a>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TAB 3: PLAYLIST — Tracklist with category subtabs
          ═══════════════════════════════════════════════════════════ */}
      <div
        id="playlist"
        className={`show-tab-panel ${activeTab === "playlist" ? "active" : ""}`}
        role="tabpanel"
      >
        <div className="show-playlist-header">
          <div className="show-playlist-tabs" role="tablist">
            <button
              className={`show-pl-tab ${playlistCategory === "halloween" ? "active" : ""}`}
              onClick={() => setPlaylistCategory("halloween")}
            >
              <span className="show-pl-tab-icon">🎃</span> Halloween{" "}
              <span className="show-pl-tab-count">
                ({halloweenSongs.length})
              </span>
            </button>
            <button
              className="show-pl-tab opacity-50 cursor-not-allowed pointer-events-none"
              aria-disabled="true"
              tabIndex={-1}
            >
              <span className="show-pl-tab-icon">🎄</span> Christmas{" "}
              <span className="show-pl-tab-count">
                ({christmasSongs.length})
              </span>
              <span className="text-xs text-zinc-500 ml-1.5 font-normal">
                Coming Soon
              </span>
            </button>
          </div>
          <span className="show-pl-original-count">
            <strong>{currentOriginals}</strong> original / {currentSongs.length}{" "}
            total
          </span>
        </div>

        {/* Main Category Section */}
        <section>
          <div className="show-section-header">
            <div className="show-section-title-group">
              <span className="show-section-icon">
                {playlistCategory === "halloween" ? "🎃" : "🎄"}
              </span>
              <h2 className="show-section-title">
                {playlistCategory === "halloween" ? "Halloween" : "Christmas"}
              </h2>
              <span className="show-section-meta">
                {currentOriginals} original / {currentSongs.length} total
              </span>
            </div>
          </div>

          <div className="tracklist">
            {currentSongs.map((song, index) => (
              <TrackRow key={song.id} song={song} trackNum={index + 1} />
            ))}
          </div>
        </section>

        {/* Vendor Credits */}
        <div className="show-vendor-section">
          <h3 className="show-vendor-section-title">Vendor Credits</h3>
          <p className="show-vendor-section-sub">
            Talented sequencers whose work helps make the show. Support them!
          </p>
          <div className="vendor-grid">
            {vendors.map((vendor) => (
              <a
                key={vendor.name}
                href={vendor.url}
                className="vendor-chip"
                target="_blank"
                rel="noopener noreferrer"
              >
                {vendor.name}{" "}
                <span className="vendor-chip-ct">· {vendor.count}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Playlist CTA */}
        <div className="show-playlist-cta">
          <h3 className="show-playlist-cta-title">
            Want to Add These to Your Show?
          </h3>
          <p className="show-playlist-cta-desc">
            Many of our original sequences are available for purchase.
          </p>
          <Link href="/sequences" className="btn-primary">
            Browse Sequences <ChevronIcon />
          </Link>
        </div>
      </div>
    </>
  );
}
