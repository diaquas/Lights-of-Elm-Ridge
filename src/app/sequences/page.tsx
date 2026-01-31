import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'xLights Sequences | Light of Elm Ridge',
  description: 'Browse and download professional xLights sequences. Free and premium options available for Christmas, Halloween, and year-round shows.',
};

// Placeholder sequence data - will be replaced with CMS/database
const sequences = [
  {
    id: 1,
    title: "Carol of the Bells",
    artist: "Trans-Siberian Orchestra",
    price: 0,
    category: "Christmas",
    duration: "3:24",
    difficulty: "Intermediate",
    description: "A classic TSO banger that'll have your neighbors questioning their life choices.",
    tags: ["Christmas", "Rock", "High Energy"],
    propCount: 24,
    hasMovingHeads: false,
  },
  {
    id: 2,
    title: "Wizards in Winter",
    artist: "Trans-Siberian Orchestra",
    price: 35,
    category: "Christmas",
    duration: "3:08",
    difficulty: "Advanced",
    description: "Complex effects that showcase what your pixels can really do. Controllers may need therapy after.",
    tags: ["Christmas", "Rock", "High Energy", "Complex"],
    propCount: 32,
    hasMovingHeads: true,
  },
  {
    id: 3,
    title: "Thunder",
    artist: "Imagine Dragons",
    price: 29,
    category: "Year Round",
    duration: "3:07",
    difficulty: "Beginner",
    description: "Perfect for newbies who want something impressive without losing their sanity.",
    tags: ["Pop", "Rock", "Beginner Friendly"],
    propCount: 18,
    hasMovingHeads: false,
  },
  {
    id: 4,
    title: "Monster Mash",
    artist: "Bobby Pickett",
    price: 0,
    category: "Halloween",
    duration: "3:12",
    difficulty: "Beginner",
    description: "It's a graveyard smash! Free because everyone deserves a spooky good time.",
    tags: ["Halloween", "Classic", "Fun"],
    propCount: 16,
    hasMovingHeads: false,
  },
  {
    id: 5,
    title: "All I Want for Christmas Is You",
    artist: "Mariah Carey",
    price: 39,
    category: "Christmas",
    duration: "4:01",
    difficulty: "Intermediate",
    description: "The whistle tones? Yeah, we sequenced those. Your neighbors will either love you or hate you.",
    tags: ["Christmas", "Pop", "Classic"],
    propCount: 28,
    hasMovingHeads: false,
  },
  {
    id: 6,
    title: "Thriller",
    artist: "Michael Jackson",
    price: 45,
    category: "Halloween",
    duration: "5:57",
    difficulty: "Advanced",
    description: "Nearly 6 minutes of pure Halloween chaos. The werewolf howl effects are *chef's kiss*.",
    tags: ["Halloween", "Pop", "Classic", "Long"],
    propCount: 35,
    hasMovingHeads: true,
  },
];

const categories = ["All", "Christmas", "Halloween", "Year Round"];
const difficulties = ["All", "Beginner", "Intermediate", "Advanced"];

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
            Professionally sequenced, obsessively tested, and ready to make your display shine.
            Some are free because we&apos;re nice like that.
          </p>
          <div className="flex justify-center gap-6 text-sm">
            <span className="px-4 py-2 bg-green-500/20 text-green-400 rounded-full">
              {freeCount} Free Sequences
            </span>
            <span className="px-4 py-2 bg-accent/20 text-accent rounded-full">
              {premiumCount} Premium Sequences
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-surface rounded-xl p-6 mb-8 border border-border">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm text-foreground/60 mb-2">Category</label>
                <select className="bg-surface-light border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                  {categories.map(cat => (
                    <option key={cat} value={cat.toLowerCase()}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Difficulty Filter */}
              <div>
                <label className="block text-sm text-foreground/60 mb-2">Difficulty</label>
                <select className="bg-surface-light border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                  {difficulties.map(diff => (
                    <option key={diff} value={diff.toLowerCase()}>{diff}</option>
                  ))}
                </select>
              </div>

              {/* Price Filter */}
              <div>
                <label className="block text-sm text-foreground/60 mb-2">Price</label>
                <select className="bg-surface-light border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                  <option value="all">All Prices</option>
                  <option value="free">Free Only</option>
                  <option value="paid">Premium Only</option>
                </select>
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-xs">
              <label className="block text-sm text-foreground/60 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search sequences..."
                className="w-full bg-surface-light border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
        </div>

        {/* Sequence Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sequences.map((sequence) => (
            <div
              key={sequence.id}
              className="bg-surface rounded-xl overflow-hidden border border-border card-hover group"
            >
              {/* Video Preview Placeholder */}
              <div className="aspect-video bg-gradient-to-br from-accent/20 to-accent-secondary/20 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl">
                    {sequence.category === 'Halloween' ? '🎃' : sequence.category === 'Christmas' ? '🎄' : '🎵'}
                  </span>
                </div>
                {/* Play button overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>
                {/* Price badge */}
                <div className="absolute top-3 right-3">
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
              <div className="p-6">
                <div className="mb-3">
                  <h3 className="font-bold text-lg group-hover:text-accent transition-colors">
                    {sequence.title}
                  </h3>
                  <p className="text-foreground/60 text-sm">{sequence.artist}</p>
                </div>

                <p className="text-foreground/50 text-sm mb-4 line-clamp-2">
                  {sequence.description}
                </p>

                {/* Meta info */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-1 bg-surface-light rounded text-xs text-foreground/60">
                    {sequence.duration}
                  </span>
                  <span className="px-2 py-1 bg-surface-light rounded text-xs text-foreground/60">
                    {sequence.difficulty}
                  </span>
                  <span className="px-2 py-1 bg-surface-light rounded text-xs text-foreground/60">
                    {sequence.propCount} props
                  </span>
                  {sequence.hasMovingHeads && (
                    <span className="px-2 py-1 bg-accent/20 rounded text-xs text-accent">
                      Moving Heads
                    </span>
                  )}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {sequence.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-border/50 rounded-full text-xs text-foreground/50">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button className="flex-1 py-2 bg-surface-light hover:bg-border rounded-lg transition-colors text-sm font-medium">
                    Preview
                  </button>
                  <button className={`flex-1 py-2 rounded-lg transition-colors text-sm font-medium ${
                    sequence.price === 0
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-accent hover:bg-accent/80 text-white'
                  }`}>
                    {sequence.price === 0 ? 'Download Free' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state message */}
        <div className="text-center py-16 text-foreground/50">
          <p className="text-lg mb-2">More sequences coming soon!</p>
          <p className="text-sm">
            We&apos;re sequencing as fast as our caffeinated fingers allow.
          </p>
        </div>

        {/* Info Section */}
        <div className="mt-16 bg-surface rounded-xl p-8 border border-border">
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
                Every sequence has a mockup video so you know exactly what you&apos;re getting before you commit.
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
              your own audio from iTunes, Amazon, or your favorite music store. We&apos;ll always tell you
              exactly which version we sequenced to.
            </p>
          </div>
        </div>

        {/* Custom Services CTA */}
        <div className="mt-12 text-center bg-gradient-to-r from-accent/10 via-accent-secondary/10 to-accent-pink/10 rounded-xl p-8 border border-border">
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
