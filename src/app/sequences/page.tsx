import type { Metadata } from "next";
import { sequences, getNewSequences } from "@/data/sequences";
import SequenceTabs from "@/components/SequenceTabs";
import BackToTop from "@/components/BackToTop";

export const metadata: Metadata = {
  title: "xLights Sequences | Lights of Elm Ridge",
  description:
    "Browse and download professional xLights sequences. Halloween and Christmas sequences with video previews. Built for pixel displays.",
};

// Organize sequences by category
const halloweenSequences = sequences.filter((s) => s.category === "Halloween");
const christmasSequences = sequences.filter((s) => s.category === "Christmas");
const newFor2026 = getNewSequences(2026);

export default function SequencesPage() {
  return (
    <div className="seq-listing-page min-h-screen">
      <div className="seq-listing-content">
        {/* Page Header - compressed toolbar layout */}
        <header className="seq-page-header">
          {/* All header content + tabs handled by SequenceTabs (client component for search) */}
          <SequenceTabs
            halloweenSequences={halloweenSequences}
            christmasSequences={christmasSequences}
            newFor2026={newFor2026}
          />
        </header>

        {/* Bottom sections */}
        <div className="seq-content">
          {/* Built For — prop reference strip */}
          <div className="props-strip">
            <div className="props-strip-header">
              <span className="props-strip-icon">🎯</span>
              <span className="props-strip-title">Built For</span>
            </div>
            <div className="props-strip-list">
              <span className="prop-tag">Matrix (70x102)</span>
              <span className="prop-tag">7 Spinners</span>
              <span className="prop-tag">House Outline</span>
              <span className="prop-tag">8 Arches</span>
              <span className="prop-tag">8 Spiders</span>
              <span className="prop-tag">7 Bats</span>
              <span className="prop-tag">Singing Pumpkin</span>
              <span className="prop-tag">8 Mini Pumpkins</span>
              <span className="prop-tag">4 Rosa Tombstones</span>
              <span className="prop-tag">6 Mini Tombstones</span>
              <span className="prop-tag">Mega Tree</span>
              <span className="prop-tag">8 Spiral Trees</span>
              <span className="prop-tag">8 Pixel Poles</span>
              <span className="prop-tag">7 Fence Panels</span>
              <span className="prop-tag">4 Floods</span>
              <span className="prop-tag">2 Firework Bursts</span>
              <span className="prop-tag">Pixel Forest</span>
            </div>
            <div className="props-strip-footer">
              Don&apos;t have all these props? Effects map well to similar
              setups — you might just need some light remapping.{" "}
              <a href="/the-show#display">See the full layout explorer →</a>
            </div>
          </div>

          {/* Slim info bar */}
          <div className="info-bar">
            <div className="info-bar-items">
              <span className="info-bar-item">
                <span className="info-bar-check">✓</span> xLights native
              </span>
              <span className="info-bar-sep">·</span>
              <span className="info-bar-item">
                <span className="info-bar-check">✓</span> Video previews
              </span>
              <span className="info-bar-sep">·</span>
              <span className="info-bar-item">
                <span className="info-bar-check">✓</span> Maps to common layouts
              </span>
              <span className="info-bar-sep">·</span>
              <span className="info-bar-item info-bar-note">
                Audio not included — grab your own from iTunes or Amazon
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Back to Top Button */}
      <BackToTop />
    </div>
  );
}
