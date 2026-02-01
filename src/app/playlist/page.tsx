import type { Metadata } from 'next';
import Link from 'next/link';
import { songlist, getSongsByCategory, getStats, getNewSongs } from '@/data/songlist';

export const metadata: Metadata = {
  title: 'Full Playlist',
  description: 'Complete song list for the Lights of Elm Ridge display. 62 songs across Halloween and Christmas with proper vendor attribution.',
};

export default function PlaylistPage() {
  const halloweenSongs = getSongsByCategory("Halloween");
  const christmasSongs = getSongsByCategory("Christmas");
  const stats = getStats();
  const newFor2026 = getNewSongs(2026);

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

        {/* New for 2026 Section */}
        {newFor2026.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-bold">New for 2026</h2>
              <span className="px-3 py-1 bg-accent/20 text-accent rounded-full text-sm font-medium">
                {newFor2026.length} songs
              </span>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {newFor2026.map((song) => (
                <div
                  key={song.id}
                  className="bg-surface rounded-xl p-4 border border-accent/30 hover:border-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{song.title}</h3>
                      <p className="text-foreground/60 text-sm">{song.artist}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      song.category === 'Halloween'
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {song.category === 'Halloween' ? '🎃' : '🎄'}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-foreground/50">
                    {song.isOriginal ? (
                      <span className="text-accent">Original sequence</span>
                    ) : (
                      <span>Sequence by {song.vendor}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quick Jump */}
        <div className="flex gap-4 mb-8">
          <a
            href="#halloween"
            className="px-6 py-3 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-xl font-medium transition-colors"
          >
            🎃 Halloween ({stats.halloweenCount})
          </a>
          <a
            href="#christmas"
            className="px-6 py-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl font-medium transition-colors"
          >
            🎄 Christmas ({stats.christmasCount})
          </a>
        </div>

        {/* Halloween Section */}
        <section id="halloween" className="mb-16 scroll-mt-24">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold">🎃 Halloween</h2>
            <span className="text-foreground/50 text-sm">
              {halloweenSongs.filter(s => s.isOriginal).length} original / {halloweenSongs.length} total
            </span>
          </div>

          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-light">
                  <th className="text-left p-4 font-semibold">Song</th>
                  <th className="text-left p-4 font-semibold hidden md:table-cell">Artist</th>
                  <th className="text-left p-4 font-semibold hidden sm:table-cell">Sequenced By</th>
                  <th className="text-center p-4 font-semibold">Year</th>
                </tr>
              </thead>
              <tbody>
                {halloweenSongs.map((song, index) => (
                  <tr
                    key={song.id}
                    className={`border-b border-border/50 hover:bg-surface-light transition-colors ${
                      index % 2 === 0 ? '' : 'bg-surface-light/30'
                    }`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{song.title}</span>
                        {song.yearAdded === 2026 && (
                          <span className="px-2 py-0.5 bg-accent/20 text-accent rounded-full text-xs font-medium">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-foreground/60 text-sm md:hidden">{song.artist}</p>
                    </td>
                    <td className="p-4 text-foreground/70 hidden md:table-cell">{song.artist}</td>
                    <td className="p-4 hidden sm:table-cell">
                      {song.isOriginal ? (
                        <span className="text-accent font-medium">Lights of Elm Ridge</span>
                      ) : (
                        <span className="text-foreground/60">{song.vendor}</span>
                      )}
                    </td>
                    <td className="p-4 text-center text-foreground/60">{song.yearAdded}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Christmas Section */}
        <section id="christmas" className="mb-16 scroll-mt-24">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold">🎄 Christmas</h2>
            <span className="text-foreground/50 text-sm">
              {christmasSongs.filter(s => s.isOriginal).length} original / {christmasSongs.length} total
            </span>
          </div>

          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-light">
                  <th className="text-left p-4 font-semibold">Song</th>
                  <th className="text-left p-4 font-semibold hidden md:table-cell">Artist</th>
                  <th className="text-left p-4 font-semibold hidden sm:table-cell">Sequenced By</th>
                  <th className="text-center p-4 font-semibold">Year</th>
                </tr>
              </thead>
              <tbody>
                {christmasSongs.map((song, index) => (
                  <tr
                    key={song.id}
                    className={`border-b border-border/50 hover:bg-surface-light transition-colors ${
                      index % 2 === 0 ? '' : 'bg-surface-light/30'
                    }`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{song.title}</span>
                        {song.yearAdded === 2026 && (
                          <span className="px-2 py-0.5 bg-accent/20 text-accent rounded-full text-xs font-medium">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-foreground/60 text-sm md:hidden">{song.artist}</p>
                    </td>
                    <td className="p-4 text-foreground/70 hidden md:table-cell">{song.artist}</td>
                    <td className="p-4 hidden sm:table-cell">
                      {song.isOriginal ? (
                        <span className="text-accent font-medium">Lights of Elm Ridge</span>
                      ) : (
                        <span className="text-foreground/60">{song.vendor}</span>
                      )}
                    </td>
                    <td className="p-4 text-center text-foreground/60">{song.yearAdded}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Vendor Credits */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Vendor Credits</h2>
          <p className="text-foreground/60 mb-6">
            A huge thank you to these talented sequencers whose work helps make the show what it is.
            Support them by checking out their sequences!
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "Visionary Sequences", count: songlist.filter(s => s.vendor === "Visionary Sequences").length },
              { name: "Easy Xlights Sequences", count: songlist.filter(s => s.vendor === "Easy Xlights Sequences").length },
              { name: "Pixel Pro Displays", count: songlist.filter(s => s.vendor === "Pixel Pro Displays").length },
              { name: "Pixel Sequence Pros", count: songlist.filter(s => s.vendor === "Pixel Sequence Pros").length },
              { name: "Showstopper Sequences", count: songlist.filter(s => s.vendor === "Showstopper Sequences").length },
              { name: "Xtreme Sequences", count: songlist.filter(s => s.vendor === "Xtreme Sequences").length },
              { name: "Paul Irwin", count: songlist.filter(s => s.vendor === "Paul Irwin").length },
            ].filter(v => v.count > 0).map((vendor) => (
              <div key={vendor.name} className="bg-surface rounded-xl p-4 border border-border">
                <div className="font-medium">{vendor.name}</div>
                <div className="text-foreground/60 text-sm">{vendor.count} sequence{vendor.count > 1 ? 's' : ''}</div>
              </div>
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
    </div>
  );
}
