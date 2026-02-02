import Link from 'next/link';
import Image from 'next/image';
import { sequences, getThumbnailUrl } from '@/data/sequences';

// Get featured sequences from the main catalog
const featuredSequences = sequences.slice(0, 3);

// Helper to get best available image for a sequence (prefer wider thumbnailUrl for cards)
function getSequenceImage(sequence: typeof sequences[0]): string {
  return sequence.thumbnailUrl || getThumbnailUrl(sequence.youtubeId) || sequence.artworkUrl || '/logo.jpg';
}

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background image - xLights layout */}
        <div className="absolute inset-0">
          <Image
            src="/layout.jpg"
            alt="xLights display layout"
            fill
            className="object-cover object-center"
            priority
            unoptimized
          />
        </div>
        {/* Gradient overlays for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-transparent" />

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="gradient-text glow-text">Light Up</span>
            <br />
            <span className="text-foreground">Your Neighborhood</span>
          </h1>
          <p className="text-xl md:text-2xl text-foreground/70 mb-8 max-w-2xl mx-auto">
            Professional xLights sequences, real show footage, and the
            occasional behind-the-scenes disaster story.
            <span className="text-accent-warm"> We keep it real.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sequences"
              className="px-8 py-4 bg-accent hover:bg-accent/80 text-white font-semibold rounded-xl transition-all glow-purple hover:scale-105"
            >
              Browse Sequences
            </Link>
            <Link
              href="/the-show"
              className="px-8 py-4 bg-surface-light hover:bg-surface border border-border text-foreground font-semibold rounded-xl transition-all hover:scale-105"
            >
              Watch The Show
            </Link>
          </div>
          <p className="mt-6 text-foreground/50 text-sm">
            Warning: May cause spontaneous dancing in your driveway.
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Three Pillars Section */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            What We&apos;re Serving Up
          </h2>
          <p className="text-foreground/60 text-center mb-16 max-w-2xl mx-auto">
            Three ways to get your light show fix. No cover charge, but tips are appreciated.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Pillar 1: Sequences */}
            <Link href="/sequences" className="group">
              <div className="gradient-border card-hover p-8 h-full">
                <div className="text-5xl mb-6">🎵</div>
                <h3 className="text-2xl font-bold mb-4 group-hover:text-accent transition-colors">
                  xLights Sequences
                </h3>
                <p className="text-foreground/60 mb-4">
                  Meticulously crafted sequences ready to drop into your show.
                  Some free, some for sale, all made with love and an unhealthy
                  amount of caffeine.
                </p>
                <ul className="text-sm text-foreground/50 space-y-2">
                  <li>✓ Free starter sequences</li>
                  <li>✓ Premium sequences for purchase</li>
                  <li>✓ xLights mockup previews</li>
                  <li>✓ Multiple layout options</li>
                </ul>
                <div className="mt-6 text-accent font-medium group-hover:translate-x-2 transition-transform inline-flex items-center gap-2">
                  Explore Sequences
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* Pillar 2: The Show */}
            <Link href="/the-show" className="group">
              <div className="gradient-border card-hover p-8 h-full">
                <div className="text-5xl mb-6">🏠</div>
                <h3 className="text-2xl font-bold mb-4 group-hover:text-accent-secondary transition-colors">
                  The Real Show
                </h3>
                <p className="text-foreground/60 mb-4">
                  See how the sequences actually look on a real house with real
                  pixels. No smoke and mirrors here—just thousands of LEDs
                  doing their thing.
                </p>
                <ul className="text-sm text-foreground/50 space-y-2">
                  <li>✓ Full show recordings</li>
                  <li>✓ Individual song performances</li>
                  <li>✓ Day vs night comparisons</li>
                  <li>✓ Proof it actually works</li>
                </ul>
                <div className="mt-6 text-accent-secondary font-medium group-hover:translate-x-2 transition-transform inline-flex items-center gap-2">
                  Watch The Show
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* Pillar 3: Behind the Scenes */}
            <Link href="/behind-the-scenes" className="group">
              <div className="gradient-border card-hover p-8 h-full">
                <div className="text-5xl mb-6">🎬</div>
                <h3 className="text-2xl font-bold mb-4 group-hover:text-accent-warm transition-colors">
                  Behind the Scenes
                </h3>
                <p className="text-foreground/60 mb-4">
                  The masterclass nobody asked for but everyone needs. Learn from
                  our wins, losses, and that one time we tripped a breaker during
                  opening night.
                </p>
                <ul className="text-sm text-foreground/50 space-y-2">
                  <li>✓ Setup tutorials</li>
                  <li>✓ xLights deep dives</li>
                  <li>✓ Hardware walkthroughs</li>
                  <li>✓ Honest mistake stories</li>
                </ul>
                <div className="mt-6 text-accent-warm font-medium group-hover:translate-x-2 transition-transform inline-flex items-center gap-2">
                  Go Behind the Scenes
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Sequences */}
      <section className="py-24 px-4 bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">
                Fresh Off the Timeline
              </h2>
              <p className="text-foreground/60">
                Latest sequences, still warm from the render farm.
              </p>
            </div>
            <Link
              href="/sequences"
              className="hidden md:flex items-center gap-2 text-accent hover:text-accent/80 font-medium"
            >
              View All
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {featuredSequences.map((sequence) => (
              <Link
                key={sequence.id}
                href={`/sequences/${sequence.slug}`}
                className="bg-surface-light rounded-xl overflow-hidden card-hover border border-border block group"
              >
                {/* Thumbnail */}
                <div className="aspect-video relative overflow-hidden">
                  <Image
                    src={getSequenceImage(sequence)}
                    alt={`${sequence.title} by ${sequence.artist}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-black/50 text-white backdrop-blur">
                      {sequence.category}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg group-hover:text-accent transition-colors">{sequence.title}</h3>
                      <p className="text-foreground/60 text-sm">{sequence.artist}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      sequence.price === 0
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-accent/20 text-accent'
                    }`}>
                      {sequence.price === 0 ? 'FREE' : `$${sequence.price}`}
                    </span>
                  </div>
                  <span className="block w-full mt-4 py-2 bg-accent hover:bg-accent/80 text-white rounded-lg transition-colors text-sm font-medium text-center">
                    View Sequence
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 text-center md:hidden">
            <Link
              href="/sequences"
              className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-medium"
            >
              View All Sequences
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter / Info Section */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Light Up
            <span className="gradient-text"> Your Display?</span>
          </h2>
          <p className="text-xl text-foreground/60 mb-6">
            All sequences are available through our partner xlightsseq.com.
            Prices start at just $5—less than your coffee habit.
          </p>

          {/* External site notice */}
          <div className="inline-flex items-center gap-3 px-6 py-4 bg-surface rounded-xl border border-border mb-8">
            <svg className="w-5 h-5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-foreground/70 text-sm text-left">
              <span className="font-semibold text-foreground">Purchases handled securely by xlightsseq.com</span>
              <br />
              You&apos;ll be redirected to complete your order on their platform.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sequences"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-accent hover:bg-accent/80 text-white font-semibold rounded-xl transition-all hover:scale-105"
            >
              View All Sequences
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-surface-light hover:bg-surface border border-border text-foreground font-semibold rounded-xl transition-all hover:scale-105"
            >
              Learn About Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
