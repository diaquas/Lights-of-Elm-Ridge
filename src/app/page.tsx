import Link from "next/link";
import Image from "next/image";
import { sequences, getThumbnailUrl } from "@/data/sequences";

// Get 4 featured sequences for the homepage grid
const featuredSequences = sequences.slice(0, 4);

// Helper to get best available image for a sequence
function getSequenceImage(sequence: (typeof sequences)[0]): string {
  return (
    sequence.thumbnailUrl ||
    getThumbnailUrl(sequence.youtubeId) ||
    sequence.artworkUrl ||
    "/logo.jpg"
  );
}

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* ════════════════════════════════════════════════════
          HERO — compressed, image as background
          Layout image shows through gradient overlay.
          Text + CTAs overlaid at bottom-left.
          ════════════════════════════════════════════════════ */}
      <section className="relative min-h-[380px] max-h-[440px] flex items-end overflow-hidden">
        {/* Background image - xLights layout */}
        <div className="absolute inset-0">
          <Image
            src="/layout.jpg"
            alt="xLights display layout"
            fill
            className="object-cover object-[center_30%]"
            priority
            unoptimized
          />
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 via-35% to-background/30" />
        </div>

        {/* Content - bottom aligned */}
        <div className="relative z-10 w-full max-w-[1100px] mx-auto px-8 pb-10">
          <h1 className="text-4xl md:text-[40px] font-bold leading-[1.08] tracking-tight max-w-[540px]">
            Light Up Your Neighborhood
          </h1>
          <p className="text-base text-foreground/70 mt-2 max-w-[480px] leading-relaxed">
            Professional xLights sequences, real show footage, and the
            occasional behind-the-scenes disaster story. We keep it real.
          </p>
          <div className="flex items-center gap-3 mt-5 flex-wrap">
            <Link
              href="/sequences"
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/80 text-white font-semibold rounded-lg transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/35"
            >
              Browse Sequences
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                viewBox="0 0 24 24"
              >
                <polyline
                  points="9 18 15 12 9 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <Link
              href="/the-show"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/6 hover:bg-white/8 text-foreground font-semibold rounded-lg border border-white/8 hover:border-white/14 transition-all"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <polygon
                  points="5 3 19 12 5 21 5 3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Watch The Show
            </Link>
          </div>
          <p className="mt-3.5 text-[13px] text-foreground/40 italic">
            Warning: May cause spontaneous dancing in your driveway.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          QUICK-NAV STRIP — "What We're Plugging In"
          Lightweight 3-column, one sentence each, arrow links.
          Paths: Sequences / The Show / Build Your Show
          ════════════════════════════════════════════════════ */}
      <section className="max-w-[1100px] mx-auto px-8">
        <div className="pt-9 pb-1.5">
          <h2 className="text-[22px] font-bold tracking-tight">
            What We&apos;re Plugging In
          </h2>
          <p className="text-sm text-foreground/40 mt-0.5">
            Three ways to get your light show fix. No cover charge, but tips are
            appreciated.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
          {/* Card: Sequences */}
          <Link
            href="/sequences"
            className="group flex flex-col p-5 bg-surface border border-border rounded-[10px] transition-all duration-300 hover:border-border/60 hover:bg-surface-light hover:-translate-y-0.5"
          >
            <span className="text-[22px] leading-none mb-2.5">🎵</span>
            <div className="text-base font-bold tracking-tight mb-1">
              xLights Sequences
            </div>
            <p className="text-[13.5px] text-foreground/60 leading-snug flex-1">
              Meticulously crafted sequences ready to drop into your show — free
              starters and premium packs, all with mockup previews.
            </p>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent mt-3 transition-all group-hover:gap-2">
              Explore Sequences
              <svg
                className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <polyline
                  points="9 18 15 12 9 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Link>

          {/* Card: The Show */}
          <Link
            href="/the-show"
            className="group flex flex-col p-5 bg-surface border border-border rounded-[10px] transition-all duration-300 hover:border-border/60 hover:bg-surface-light hover:-translate-y-0.5"
          >
            <span className="text-[22px] leading-none mb-2.5">🏠</span>
            <div className="text-base font-bold tracking-tight mb-1">
              The Real Show
            </div>
            <p className="text-[13.5px] text-foreground/60 leading-snug flex-1">
              Real house, real pixels, no smoke and mirrors — full recordings,
              individual songs, and proof it actually works.
            </p>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent mt-3 transition-all group-hover:gap-2">
              Watch The Show
              <svg
                className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <polyline
                  points="9 18 15 12 9 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Link>

          {/* Card: Build Your Show */}
          <Link
            href="/build-your-show"
            className="group flex flex-col p-5 bg-surface border border-border rounded-[10px] transition-all duration-300 hover:border-border/60 hover:bg-surface-light hover:-translate-y-0.5"
          >
            <span className="text-[22px] leading-none mb-2.5">🔧</span>
            <div className="text-base font-bold tracking-tight mb-1">
              Build Your Show
            </div>
            <p className="text-[13.5px] text-foreground/60 leading-snug flex-1">
              Gear guides, shopping lists, and the wizard tool that builds your
              first display — from &quot;what&apos;s a pixel?&quot; to opening
              night.
            </p>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent mt-3 transition-all group-hover:gap-2">
              Start Building
              <svg
                className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <polyline
                  points="9 18 15 12 9 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Link>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          FRESH OFF THE TIMELINE — latest sequences
          Uses unified card component matching the listing page.
          ════════════════════════════════════════════════════ */}
      <section className="max-w-[1100px] mx-auto px-8">
        <div className="flex items-baseline justify-between pt-11 pb-4 gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">✨</span>
            <h2 className="text-[22px] font-bold tracking-tight">
              Fresh Off the Timeline
            </h2>
            <span className="text-sm text-foreground/40 ml-1">
              Latest sequences, still warm from the render farm.
            </span>
          </div>
          <Link
            href="/sequences"
            className="hidden md:flex items-center gap-1 text-[13px] text-foreground/60 font-medium px-3.5 py-1.5 rounded-md bg-white/6 border border-white/8 hover:bg-white/8 hover:text-foreground transition-colors"
          >
            View All
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              viewBox="0 0 24 24"
            >
              <polyline
                points="9 18 15 12 9 6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {featuredSequences.map((sequence) => (
            <Link
              key={sequence.id}
              href={`/sequences/${sequence.slug}`}
              className="group block bg-surface border border-border rounded-[10px] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-border/60 hover:shadow-lg hover:shadow-black/30"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video overflow-hidden bg-black/50">
                <Image
                  src={getSequenceImage(sequence)}
                  alt={`${sequence.title} by ${sequence.artist}`}
                  fill
                  className="object-cover transition-transform duration-400 group-hover:scale-[1.03]"
                  unoptimized
                />
                {/* Badges */}
                <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-500/12 text-amber-500">
                    {sequence.category}
                  </span>
                  {sequence.isNew && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-green-500/12 text-green-500">
                      New
                    </span>
                  )}
                </div>
              </div>
              {/* Body */}
              <div className="p-3">
                <div className="text-sm font-semibold text-foreground leading-tight truncate">
                  {sequence.title}
                </div>
                <div className="text-xs text-foreground/40 truncate">
                  {sequence.artist}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[15px] font-bold">
                    {sequence.price === 0 ? "FREE" : `$${sequence.price}`}
                  </span>
                  <span className="text-xs font-semibold text-accent flex items-center gap-1">
                    View →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="pt-5 text-center">
          <Link
            href="/sequences"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground/60 px-6 py-2.5 rounded-lg bg-white/6 border border-white/8 hover:bg-white/8 hover:text-foreground transition-colors"
          >
            View All Sequences
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              viewBox="0 0 24 24"
            >
              <polyline
                points="9 18 15 12 9 6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          YOUTUBE SUBSCRIBE STRIP
          Lightweight bar, not a full section
          ════════════════════════════════════════════════════ */}
      <section className="max-w-[1100px] mx-auto px-8 pt-11">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-5 bg-accent/12 border border-accent/20 rounded-[10px]">
          <div className="text-sm font-medium text-foreground text-center md:text-left">
            Don&apos;t miss a show{" "}
            <span className="text-foreground/40 font-normal">
              — new footage as we build and grow the display
            </span>
          </div>
          <a
            href="https://www.youtube.com/channel/UCKvEDoz59mtUv2UCuJq6vuA"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-accent hover:bg-accent/80 rounded-lg transition-all hover:-translate-y-0.5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            Subscribe on YouTube
          </a>
        </div>
      </section>

      {/* Bottom spacing before footer */}
      <div className="h-16" />
    </div>
  );
}
