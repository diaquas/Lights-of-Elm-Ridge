import Link from 'next/link';
import type { Metadata } from 'next';
import { sequences, getNewSequences } from '@/data/sequences';

export const metadata: Metadata = {
  title: 'xLights Sequences | Lights of Elm Ridge',
  description: 'Browse and download professional xLights sequences. Halloween and Christmas sequences with video previews. Built for pixel displays.',
};

// Organize sequences by category
const halloweenSequences = sequences.filter(s => s.category === 'Halloween');
const christmasSequences = sequences.filter(s => s.category === 'Christmas');
const newFor2026 = getNewSequences(2026);

function SequenceCard({ sequence }: { sequence: typeof sequences[0] }) {
  return (
    <Link
      href={`/sequences/${sequence.slug}`}
      className="bg-surface rounded-xl overflow-hidden border border-border card-hover group block"
    >
      {/* Video Preview */}
      <div className="aspect-video relative overflow-hidden bg-surface-light">
        {sequence.youtubeId ? (
          <iframe
            src={`https://www.youtube.com/embed/${sequence.youtubeId}`}
            title={`${sequence.title} - ${sequence.artist}`}
            className="absolute inset-0 w-full h-full pointer-events-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent/10 to-surface-light">
            <span className="text-6xl">
              {sequence.category === 'Halloween' ? '🎃' : '🎄'}
            </span>
          </div>
        )}
        {/* Price badge */}
        <div className="absolute top-3 right-3 z-10">
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
            sequence.price === 0
              ? 'bg-green-500 text-white'
              : 'bg-accent text-white'
          }`}>
            {sequence.price === 0 ? 'FREE' : `$${sequence.price}`}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="mb-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg group-hover:text-accent transition-colors">
              {sequence.title}
            </h3>
            {sequence.yearAdded === 2026 && (
              <span className="px-2 py-0.5 bg-accent/20 text-accent rounded-full text-xs font-semibold">
                NEW
              </span>
            )}
          </div>
          <p className="text-foreground/60 text-sm">{sequence.artist}</p>
        </div>

        <p className="text-foreground/50 text-sm mb-3 line-clamp-2">
          {sequence.description}
        </p>

        {/* Meta info */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="px-2 py-1 bg-surface-light rounded text-xs text-foreground/60">
            {sequence.duration}
          </span>
          <span className="px-2 py-1 bg-surface-light rounded text-xs text-foreground/60">
            {sequence.difficulty}
          </span>
          {sequence.hasMatrix && (
            <span className="px-2 py-1 bg-accent/20 rounded text-xs text-accent">
              Matrix
            </span>
          )}
        </div>

        {/* CTA */}
        <span className="block w-full py-2 bg-accent hover:bg-accent/80 text-white rounded-lg transition-colors text-sm font-medium text-center">
          View Details →
        </span>
      </div>
    </Link>
  );
}

export default function SequencesPage() {
  const freeCount = sequences.filter(s => s.price === 0).length;
  const premiumCount = sequences.filter(s => s.price > 0).length;

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">xLights Sequences</span>
          </h1>
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto mb-6">
            Professionally sequenced, obsessively tested, and ready to make your display the talk of the neighborhood.
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

        {/* Quick Jump */}
        <div className="flex justify-center gap-4 mb-8">
          <a href="#halloween" className="px-6 py-3 bg-surface hover:bg-surface-light rounded-xl border border-border transition-colors flex items-center gap-2">
            <span className="text-2xl">🎃</span>
            <span>Halloween ({halloweenSequences.length})</span>
          </a>
          <a href="#christmas" className="px-6 py-3 bg-surface hover:bg-surface-light rounded-xl border border-border transition-colors flex items-center gap-2">
            <span className="text-2xl">🎄</span>
            <span>Christmas ({christmasSequences.length})</span>
          </a>
        </div>

        {/* Currently Available Notice */}
        <div className="bg-surface-light rounded-xl p-4 mb-12 border border-border text-center">
          <p className="text-foreground/70">
            <span className="text-accent font-semibold">Currently available on xlightsseq.com</span> — Own store coming soon!
            Click any sequence to view details and purchase.
          </p>
        </div>

        {/* New for 2026 Section */}
        {newFor2026.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-4 mb-8">
              <span className="text-4xl">✨</span>
              <div>
                <h2 className="text-3xl font-bold">New for 2026</h2>
                <p className="text-foreground/60">Fresh sequences added this season</p>
              </div>
              <span className="ml-auto px-4 py-2 bg-accent/20 text-accent rounded-full text-sm font-medium">
                {newFor2026.length} new
              </span>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {newFor2026.map((sequence) => (
                <SequenceCard key={sequence.id} sequence={sequence} />
              ))}
            </div>
          </section>
        )}

        {/* Halloween Section */}
        <section id="halloween" className="mb-20 scroll-mt-24">
          <div className="flex items-center gap-4 mb-8">
            <span className="text-4xl">🎃</span>
            <div>
              <h2 className="text-3xl font-bold">Halloween Sequences</h2>
              <p className="text-foreground/60">Spooky, fun, and everything in between</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {halloweenSequences.map((sequence) => (
              <SequenceCard key={sequence.id} sequence={sequence} />
            ))}
          </div>
        </section>

        {/* Christmas Section */}
        <section id="christmas" className="mb-20 scroll-mt-24">
          <div className="flex items-center gap-4 mb-8">
            <span className="text-4xl">🎄</span>
            <div>
              <h2 className="text-3xl font-bold">Christmas Sequences</h2>
              <p className="text-foreground/60">Holiday magic for your display</p>
            </div>
          </div>

          {christmasSequences.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {christmasSequences.map((sequence) => (
                <SequenceCard key={sequence.id} sequence={sequence} />
              ))}
            </div>
          ) : (
            <div className="bg-surface rounded-xl p-8 border border-border text-center">
              <span className="text-6xl block mb-4">🎅</span>
              <h3 className="text-xl font-semibold mb-2">Coming This Fall</h3>
              <p className="text-foreground/60 max-w-md mx-auto">
                Christmas sequences are in production and will be available before the season starts.
                Check back soon!
              </p>
            </div>
          )}
        </section>

        {/* Props/Models Info */}
        <div className="bg-surface rounded-xl p-8 border border-border mb-8">
          <h2 className="text-2xl font-bold mb-6">What&apos;s Included in Each Sequence</h2>
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
              <h3 className="font-semibold mb-3 text-accent">Halloween Props</h3>
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
            Don&apos;t have all these props? No worries. Effects map reasonably well to similar setups—you might just need to do some light remapping.
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
                All sequences are built in xLights and export cleanly. No weird hacks required.
              </p>
            </div>
            <div>
              <div className="text-3xl mb-3">🎬</div>
              <h3 className="font-semibold mb-2">Video Previews</h3>
              <p className="text-sm text-foreground/60">
                Every sequence has a mockup video so you know exactly what you&apos;re getting.
              </p>
            </div>
            <div>
              <div className="text-3xl mb-3">🔧</div>
              <h3 className="font-semibold mb-2">Layout Flexibility</h3>
              <p className="text-sm text-foreground/60">
                Built with common props in mind. Effects map well to different setups.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-border">
            <h3 className="font-semibold mb-3">A Note on Audio</h3>
            <p className="text-sm text-foreground/60">
              Sequences don&apos;t include music files (licensing is a whole thing). You&apos;ll need to grab
              your own audio from iTunes, Amazon, or your favorite music store. We always specify
              which version was used for timing.
            </p>
          </div>
        </div>

        {/* Custom Services CTA */}
        <div className="text-center bg-gradient-to-r from-accent/10 via-surface to-accent/10 rounded-xl p-8 border border-border">
          <h2 className="text-2xl font-bold mb-3">
            Need Something Custom?
          </h2>
          <p className="text-foreground/60 mb-6 max-w-xl mx-auto">
            Got a song that&apos;s been stuck in your head? Want a sequence mapped to your specific layout?
            We do custom work too.
          </p>
          <Link
            href="/about#services"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/80 text-white font-semibold rounded-xl transition-all"
          >
            Learn About Custom Services
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
