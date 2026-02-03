import type { Metadata } from "next";
import Link from "next/link";
import {
  songlist,
  getSongsByCategory,
  getStats,
  getNewSongs,
} from "@/data/songlist";
import PlaylistTabs from "@/components/PlaylistTabs";
import BackToTop from "@/components/BackToTop";

export const metadata: Metadata = {
  title: "Full Playlist | Lights of Elm Ridge",
  description:
    "Complete song list for the Lights of Elm Ridge display. 62 songs across Halloween and Christmas with proper vendor attribution.",
};

// Organize songs by category
const halloweenSongs = getSongsByCategory("Halloween");
const christmasSongs = getSongsByCategory("Christmas");
const newFor2026 = getNewSongs(2026);

export default function PlaylistPage() {
  const stats = getStats();

  // Get vendor data for credits section
  const vendors = [
    {
      name: "Visionary Sequences",
      url: "https://visionarylightshows.com/",
      count: songlist.filter((s) => s.vendor === "Visionary Sequences").length,
    },
    {
      name: "Easy Xlights Sequences",
      url: "https://www.easyxlightssequences.com/",
      count: songlist.filter((s) => s.vendor === "Easy Xlights Sequences")
        .length,
    },
    {
      name: "Pixel Pro Displays",
      url: "https://pixelprodisplays.com/",
      count: songlist.filter((s) => s.vendor === "Pixel Pro Displays").length,
    },
    {
      name: "Pixel Sequence Pros",
      url: "https://www.pixelsequencepros.com/",
      count: songlist.filter((s) => s.vendor === "Pixel Sequence Pros").length,
    },
    {
      name: "Showstopper Sequences",
      url: "https://www.showstoppersequences.com/",
      count: songlist.filter((s) => s.vendor === "Showstopper Sequences")
        .length,
    },
    {
      name: "Xtreme Sequences",
      url: "https://xtremesequences.com/",
      count: songlist.filter((s) => s.vendor === "Xtreme Sequences").length,
    },
    {
      name: "Paul Irwin",
      url: "https://xlightsseq.com/creators/paul-irwin.74/",
      count: songlist.filter((s) => s.vendor === "Paul Irwin").length,
    },
  ].filter((v) => v.count > 0);

  return (
    <div className="playlist-page min-h-screen">
      <div className="playlist-content">
        {/* Page Header - compressed toolbar layout */}
        <header className="playlist-header">
          {/* Row 1: Title + Stats */}
          <div className="playlist-header-top seq-anim-in seq-delay-1">
            <div className="playlist-title-group">
              <h1 className="playlist-title font-display">Full Playlist</h1>
              <p className="playlist-subtitle">
                Every song in the show, with credit where credit is due.
              </p>
            </div>
            <div className="playlist-stat-pills">
              <span className="playlist-stat-pill">
                <span className="playlist-stat-pill-number">
                  {stats.totalSongs}
                </span>{" "}
                songs
              </span>
              <span className="playlist-stat-pill">
                <span className="playlist-stat-pill-number">
                  {stats.originalCount}
                </span>{" "}
                original
              </span>
            </div>
          </div>

          {/* Row 2: Category tabs + original count (handled by PlaylistTabs) */}
          <PlaylistTabs
            halloweenSongs={halloweenSongs}
            christmasSongs={christmasSongs}
            newFor2026={newFor2026}
          />
        </header>

        {/* Additional sections rendered after PlaylistTabs content */}
        <div className="playlist-main">
          {/* Vendor Credits */}
          <div className="playlist-vendor-section seq-anim-in seq-delay-5">
            <h3 className="playlist-vendor-title">Vendor Credits</h3>
            <p className="playlist-vendor-subtitle">
              Talented sequencers whose work helps make the show. Support them!
            </p>
            <div className="playlist-vendor-grid">
              {vendors.map((vendor) => (
                <a
                  key={vendor.name}
                  href={vendor.url}
                  className="playlist-vendor-chip"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {vendor.name}
                  <span className="playlist-vendor-chip-count">
                    · {vendor.count}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="playlist-cta seq-anim-in seq-delay-6">
            <h3 className="playlist-cta-title">
              Want to Add These to Your Show?
            </h3>
            <p className="playlist-cta-desc">
              Many of our original sequences are available for purchase. Check
              out the sequences page to find something for your display.
            </p>
            <Link
              href="/sequences"
              className="playlist-btn playlist-btn-primary"
            >
              Browse Sequences
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
            </Link>
          </div>
        </div>
      </div>

      {/* Back to Top Button */}
      <BackToTop />
    </div>
  );
}
