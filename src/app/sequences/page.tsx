import Link from "next/link";
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
  const freeCount = sequences.filter((s) => s.price === 0).length;
  const premiumCount = sequences.filter((s) => s.price > 0).length;

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">xLights Sequences</span>
          </h1>
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto mb-6">
            Professionally sequenced, obsessively tested, and ready to make your
            display the talk of the neighborhood.
          </p>
          <div className="flex justify-center gap-6 text-sm">
            {freeCount > 0 && (
              <span className="px-4 py-2 bg-green-500/20 text-green-400 rounded-full">
                {freeCount} Free Sequences
              </span>
            )}
            <span className="px-4 py-2 bg-accent/20 text-accent rounded-full">
              {premiumCount} Premium Sequences
            </span>
          </div>
        </div>

        {/* Tabbed Sequences */}
        <SequenceTabs
          halloweenSequences={halloweenSequences}
          christmasSequences={christmasSequences}
          newFor2026={newFor2026}
        />

        {/* Props/Models Info */}
        <div className="bg-surface rounded-xl p-8 border border-border mb-8">
          <h2 className="text-2xl font-bold mb-6">
            What&apos;s Included in Each Sequence
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-3 text-accent">Standard Props</h3>
              <ul className="text-sm text-foreground/60 space-y-1">
                <li>• Matrix (70x100 pixels)</li>
                <li>• Pixel Forest</li>
                <li>• 8 Arches</li>
                <li>• House Outlines</li>
                <li>• 8 Floods</li>
                <li>• 5 Pixel Poles</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-accent">
                Halloween Props
              </h3>
              <ul className="text-sm text-foreground/60 space-y-1">
                <li>• Singing Pumpkin</li>
                <li>• 8 Mini Pumpkins</li>
                <li>• 6 Spiders</li>
                <li>• 5 Bats</li>
                <li>• 4 Tombstones</li>
                <li>• Showstopper & Fuzion Spinners</li>
                <li>• Mini Fireworks & Full Fireworks</li>
              </ul>
            </div>
          </div>
          <p className="mt-6 text-sm text-foreground/50 italic">
            Don&apos;t have all these props? No worries. Effects map reasonably
            well to similar setups—you might just need to do some light
            remapping.
          </p>
        </div>

        {/* What You Get Section */}
        <div className="bg-surface rounded-xl p-8 border border-border mb-8">
          <h2 className="text-2xl font-bold mb-6">What You&apos;re Getting</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-3xl mb-3">📁</div>
              <h3 className="font-semibold mb-2">xLights Compatible</h3>
              <p className="text-sm text-foreground/60">
                All sequences are built in xLights and export cleanly. No weird
                hacks required.
              </p>
            </div>
            <div>
              <div className="text-3xl mb-3">🎬</div>
              <h3 className="font-semibold mb-2">Video Previews</h3>
              <p className="text-sm text-foreground/60">
                Every sequence has a mockup video so you know exactly what
                you&apos;re getting.
              </p>
            </div>
            <div>
              <div className="text-3xl mb-3">🔧</div>
              <h3 className="font-semibold mb-2">Layout Flexibility</h3>
              <p className="text-sm text-foreground/60">
                Built with common props in mind. Effects map well to different
                setups.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-border">
            <h3 className="font-semibold mb-3">A Note on Audio</h3>
            <p className="text-sm text-foreground/60">
              Sequences don&apos;t include music files (licensing is a whole
              thing). You&apos;ll need to grab your own audio from iTunes,
              Amazon, or your favorite music store. We always specify which
              version was used for timing.
            </p>
          </div>
        </div>

        {/* Custom Services CTA */}
        <div className="text-center bg-gradient-to-r from-accent/10 via-surface to-accent/10 rounded-xl p-8 border border-border">
          <h2 className="text-2xl font-bold mb-3">Need Something Custom?</h2>
          <p className="text-foreground/60 mb-6 max-w-xl mx-auto">
            Got a song that&apos;s been stuck in your head? Want a sequence
            mapped to your specific layout? We do custom work too.
          </p>
          <Link
            href="/about#services"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/80 text-white font-semibold rounded-xl transition-all"
          >
            Learn About Custom Services
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>

      {/* Back to Top Button */}
      <BackToTop />
    </div>
  );
}
