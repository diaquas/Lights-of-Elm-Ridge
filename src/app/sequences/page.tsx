import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'xLights Sequences | Lights of Elm Ridge',
  description: 'Browse and download professional xLights sequences. Halloween and Christmas sequences with video previews. Built for pixel displays.',
};

// Real sequence data from Lights of Elm Ridge
const sequences = [
  {
    id: 1,
    title: "The Dead Dance",
    artist: "Lady Gaga",
    price: 9,
    category: "Halloween",
    duration: "3:45",
    difficulty: "Intermediate",
    description: "Fresh from the new season of Wednesday on Netflix. This sequence inter-splices the official music video with that infamous dance scene. Your display will be serving serious Addams Family energy.",
    tags: ["Halloween", "Pop", "Netflix", "Wednesday"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "https://xlightsseq.com/sequences/the-dead-dance-lady-gaga.1404/",
    youtubeId: "eyXwPMxZ7-E",
    models: ["Matrix (70x100)", "Singing Pumpkin", "Mini Fireworks", "Showstopper Spinners", "Spiders", "Bats", "Tombstones"],
  },
  {
    id: 2,
    title: "Shadow",
    artist: "Livingston",
    price: 5,
    category: "Halloween",
    duration: "3:32",
    difficulty: "Intermediate",
    description: "Vibrant colors and dynamic patterns bring the emotional journey of this song to life. A moody, atmospheric sequence that proves Halloween doesn't always have to be jump scares and monster mashes.",
    tags: ["Halloween", "Indie", "Atmospheric", "Moody"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "https://xlightsseq.com/sequences/shadow-livingston.1242/",
    youtubeId: "GY7YOffoC_0",
    models: ["Matrix (70x100)", "Singing Pumpkin", "Fireworks", "Showstopper Spinners", "Fuzion Spinner", "Pixel Forest", "Arches"],
  },
  {
    id: 3,
    title: "Abracadabra",
    artist: "Lady Gaga",
    price: 5,
    category: "Halloween",
    duration: "3:45",
    difficulty: "Intermediate",
    description: "Classic rock meets Halloween magic. This 80s hit brings the perfect blend of spooky vibes and nostalgic fun to your display.",
    tags: ["Halloween", "Classic Rock", "80s", "Magic"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "https://xlightsseq.com/sequences/authors/diaquas.8537/",
    youtubeId: "U_h451HtYt4",
    models: ["Matrix (70x100)", "Singing Pumpkin", "Fireworks", "Showstopper Spinners", "Spiders", "Bats"],
  },
  {
    id: 4,
    title: "Darkside",
    artist: "Alan Walker",
    price: 5,
    category: "Halloween",
    duration: "3:31",
    difficulty: "Intermediate",
    description: "EDM meets the darkness. Heavy bass drops and atmospheric builds create an immersive Halloween experience that'll have your neighbors feeling the beat.",
    tags: ["Halloween", "EDM", "Electronic", "Atmospheric"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "https://xlightsseq.com/sequences/authors/diaquas.8537/",
    youtubeId: "2cfsWcecOlU",
    models: ["Matrix (70x100)", "Singing Pumpkin", "Fireworks", "Showstopper Spinners", "Pixel Forest"],
  },
  {
    id: 5,
    title: "Mary Did You Know",
    artist: "Pentatonix",
    price: 9,
    category: "Christmas",
    duration: "4:12",
    difficulty: "Intermediate",
    description: "A crowd favorite with crescendos that'll give you chills. The a cappella harmonies translate beautifully to pixels. This one hits different at 2am when you're testing alone in your driveway.",
    tags: ["Christmas", "A Cappella", "Emotional", "Classic"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "https://xlightsseq.com/sequences/mary-did-you-know-pentatonix.1324/",
    youtubeId: null,
    models: ["Matrix (70x100)", "Pixel Forest", "Arches", "House Outlines", "Floods"],
  },
  {
    id: 6,
    title: "This Is Halloween",
    artist: "Danny Elfman",
    price: 5,
    category: "Halloween",
    duration: "3:18",
    difficulty: "Beginner",
    description: "The Nightmare Before Christmas classic that started it all. Perfect for Halloween newbies or anyone who believes in the Pumpkin King. Lock, Shock, and Barrel approved.",
    tags: ["Halloween", "Classic", "Disney", "Beginner Friendly"],
    propCount: 30,
    hasMatrix: true,
    xlightsSeqUrl: "https://xlightsseq.com/sequences/this-is-halloween.1175/",
    youtubeId: null,
    models: ["Matrix", "Singing Pumpkin", "Mini Pumpkins", "Pixel Poles", "Tombstones", "Spiders"],
  },
  {
    id: 7,
    title: "Carousel",
    artist: "Melanie Martinez",
    price: 5,
    category: "Halloween",
    duration: "3:15",
    difficulty: "Intermediate",
    description: "Subtle circus and carnival vibes throughout. You might recognize this from American Horror Story: Freak Show promos. Creepy-cute aesthetic that Melanie fans will absolutely lose it over.",
    tags: ["Halloween", "Indie Pop", "Creepy Cute", "AHS"],
    propCount: 32,
    hasMatrix: true,
    xlightsSeqUrl: "https://xlightsseq.com/sequences/carousel-melanie-martinez.1185/",
    youtubeId: null,
    models: ["Matrix", "Mini Fireworks", "Showstopper Spinners", "Pixel Poles", "Spiders", "Bats"],
  },
];

const categories = ["All", "Christmas", "Halloween"];
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

        {/* Currently Available Notice */}
        <div className="bg-surface-light rounded-xl p-4 mb-8 border border-border text-center">
          <p className="text-foreground/70">
            <span className="text-accent font-semibold">Currently available on xlightsseq.com</span> — Own store coming soon!
            Click any sequence to view/purchase on the marketplace.
          </p>
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
              {/* Video Preview */}
              <div className="aspect-video relative overflow-hidden bg-surface-light">
                {sequence.youtubeId ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${sequence.youtubeId}`}
                    title={`${sequence.title} - ${sequence.artist}`}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
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
                {/* Category badge */}
                <div className="absolute top-3 left-3 z-10">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-black/50 text-white backdrop-blur">
                    {sequence.category}
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
                    {sequence.propCount}+ props
                  </span>
                  {sequence.hasMatrix && (
                    <span className="px-2 py-1 bg-accent/20 rounded text-xs text-accent">
                      Matrix
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

                {/* CTA */}
                <a
                  href={sequence.xlightsSeqUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-2 bg-accent hover:bg-accent/80 text-white rounded-lg transition-colors text-sm font-medium text-center"
                >
                  View on xlightsseq.com →
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* More Coming Soon */}
        <div className="text-center py-16 text-foreground/50">
          <p className="text-lg mb-2">More sequences in the works!</p>
          <p className="text-sm">
            Currently focusing on Halloween 2026. Christmas sequences coming this fall.
          </p>
        </div>

        {/* Props/Models Info */}
        <div className="mt-8 bg-surface rounded-xl p-8 border border-border">
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
        <div className="mt-8 bg-surface rounded-xl p-8 border border-border">
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
        <div className="mt-12 text-center bg-gradient-to-r from-accent/10 via-surface to-accent/10 rounded-xl p-8 border border-border">
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
