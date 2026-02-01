import type { Metadata } from 'next';
import Link from 'next/link';
import { songlist, getSongsByCategory, getStats, getNewSongs } from '@/data/songlist';
import PlaylistTabs from '@/components/PlaylistTabs';
import BackToTop from '@/components/BackToTop';

export const metadata: Metadata = {
  title: 'Full Playlist',
  description: 'Complete song list for the Lights of Elm Ridge display. 62 songs across Halloween and Christmas with proper vendor attribution.',
};

// Organize songs by category
const halloweenSongs = getSongsByCategory("Halloween");
const christmasSongs = getSongsByCategory("Christmas");
const newFor2026 = getNewSongs(2026);

export default function PlaylistPage() {
  const stats = getStats();

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Full Playlist</span>
          </h1>
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
            Every song in the Lights of Elm Ridge display, with credit where credit is due.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-surface rounded-xl p-6 border border-border text-center">
            <div className="text-3xl font-bold gradient-text">{stats.totalSongs}</div>
            <div className="text-foreground/60 text-sm">Total Songs</div>
          </div>
          <div className="bg-surface rounded-xl p-6 border border-border text-center">
            <div className="text-3xl font-bold text-orange-400">{stats.halloweenCount}</div>
            <div className="text-foreground/60 text-sm">Halloween</div>
          </div>
          <div className="bg-surface rounded-xl p-6 border border-border text-center">
            <div className="text-3xl font-bold text-green-400">{stats.christmasCount}</div>
            <div className="text-foreground/60 text-sm">Christmas</div>
          </div>
          <div className="bg-surface rounded-xl p-6 border border-border text-center">
            <div className="text-3xl font-bold text-accent">{stats.originalCount}</div>
            <div className="text-foreground/60 text-sm">Original Sequences</div>
          </div>
        </div>

        {/* Tabbed Playlist */}
        <PlaylistTabs
          halloweenSongs={halloweenSongs}
          christmasSongs={christmasSongs}
          newFor2026={newFor2026}
        />

        {/* Vendor Credits */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Vendor Credits</h2>
          <p className="text-foreground/60 mb-6">
            A huge thank you to these talented sequencers whose work helps make the show what it is.
            Support them by checking out their sequences!
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "Visionary Sequences", url: "https://visionarylightshows.com/", count: songlist.filter(s => s.vendor === "Visionary Sequences").length },
              { name: "Easy Xlights Sequences", url: "https://www.easyxlightssequences.com/", count: songlist.filter(s => s.vendor === "Easy Xlights Sequences").length },
              { name: "Pixel Pro Displays", url: "https://pixelprodisplays.com/", count: songlist.filter(s => s.vendor === "Pixel Pro Displays").length },
              { name: "Pixel Sequence Pros", url: "https://www.pixelsequencepros.com/", count: songlist.filter(s => s.vendor === "Pixel Sequence Pros").length },
              { name: "Showstopper Sequences", url: "https://www.showstoppersequences.com/", count: songlist.filter(s => s.vendor === "Showstopper Sequences").length },
              { name: "Xtreme Sequences", url: "https://xtremesequences.com/", count: songlist.filter(s => s.vendor === "Xtreme Sequences").length },
              { name: "Paul Irwin", url: "https://xlightsseq.com/creators/paul-irwin.74/", count: songlist.filter(s => s.vendor === "Paul Irwin").length },
            ].filter(v => v.count > 0).map((vendor) => (
              <a
                key={vendor.name}
                href={vendor.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-surface rounded-xl p-4 border border-border hover:border-accent/50 hover:bg-surface-light transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium group-hover:text-accent transition-colors">{vendor.name}</div>
                  <svg className="w-4 h-4 text-foreground/40 group-hover:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
                <div className="text-foreground/60 text-sm">{vendor.count} sequence{vendor.count > 1 ? 's' : ''}</div>
              </a>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-accent/10 via-surface to-accent-secondary/10 rounded-xl p-8 border border-border">
            <h2 className="text-2xl font-bold mb-4">Want to Add These to Your Show?</h2>
            <p className="text-foreground/60 mb-6 max-w-lg mx-auto">
              Many of our original sequences are available for purchase.
              Check out the sequences page to find something for your display.
            </p>
            <Link
              href="/sequences"
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/80 text-white font-semibold rounded-xl transition-colors"
            >
              Browse Sequences
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>

        {/* Back to Home */}
        <div className="mt-16 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>

      {/* Back to Top Button */}
      <BackToTop />
    </div>
  );
}
