import Link from "next/link";
import Image from "next/image";

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
              href="/the-show#display"
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
              Explore the Display
            </Link>
          </div>
          <p className="mt-3.5 text-[13px] text-foreground/40 italic">
            Warning: May cause spontaneous dancing in your driveway.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          LATEST DROPS — featured sequence cards
          Album art, song name, artist, price
          ════════════════════════════════════════════════════ */}
      <section className="latest-section">
        <div className="latest-header">
          <div className="latest-header-left">
            <h2 className="latest-title">Latest Drops</h2>
            <span className="latest-subtitle">
              Fresh sequences ready to run
            </span>
          </div>
          <Link href="/sequences" className="latest-see-all">
            See all sequences
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>

        <div className="latest-grid">
          {/* I Think We're Alone Now - has mockup video and r2Url */}
          <Link
            href="/sequences/i-think-were-alone-now"
            className="latest-card"
          >
            <div className="latest-card-thumb">
              <Image
                src="https://i.scdn.co/image/ab67616d0000b2731e2565cb9cc67c378d2a8f31"
                alt="I Think We're Alone Now by Hidden Citizens"
                width={300}
                height={300}
                className="latest-card-img"
                unoptimized
              />
              <span className="latest-card-badge badge-new">New</span>
            </div>
            <div className="latest-card-body">
              <div className="latest-card-title">
                I Think We&apos;re Alone Now
              </div>
              <div className="latest-card-artist">Hidden Citizens</div>
              <div className="latest-card-price">$20</div>
            </div>
          </Link>

          {/* Abracadabra - has mockup video and r2Url */}
          <Link href="/sequences/abracadabra" className="latest-card">
            <div className="latest-card-thumb">
              <Image
                src="https://dm3v96wjcnps9.cloudfront.net/icpn/00602475886266/00602475886266-cover-zoom.jpg"
                alt="Abracadabra by Lady Gaga"
                width={300}
                height={300}
                className="latest-card-img"
                unoptimized
              />
              <span className="latest-card-badge badge-new">New</span>
            </div>
            <div className="latest-card-body">
              <div className="latest-card-title">Abracadabra</div>
              <div className="latest-card-artist">Lady Gaga</div>
              <div className="latest-card-price">$20</div>
            </div>
          </Link>

          {/* This Is Halloween - has youtubeId and r2Url */}
          <Link href="/sequences/this-is-halloween" className="latest-card">
            <div className="latest-card-thumb">
              <Image
                src="https://i.scdn.co/image/ab67616d0000b2737073748b25a091da2589a6df"
                alt="This Is Halloween by Danny Elfman"
                width={300}
                height={300}
                className="latest-card-img"
                unoptimized
              />
            </div>
            <div className="latest-card-body">
              <div className="latest-card-title">This Is Halloween</div>
              <div className="latest-card-artist">Danny Elfman</div>
              <div className="latest-card-price">$10</div>
            </div>
          </Link>

          {/* Spooky Scary Skeletons - has mockup video and r2Url (FREE) */}
          <Link
            href="/sequences/spooky-scary-skeletons"
            className="latest-card"
          >
            <div className="latest-card-thumb">
              <Image
                src="/spookymain.png"
                alt="Spooky Scary Skeletons by Andrew Gold"
                width={300}
                height={300}
                className="latest-card-img"
                unoptimized
              />
              <span className="latest-card-badge badge-free">Free</span>
            </div>
            <div className="latest-card-body">
              <div className="latest-card-title">Spooky Scary Skeletons</div>
              <div className="latest-card-artist">Andrew Gold</div>
              <div className="latest-card-price">Free</div>
            </div>
          </Link>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          REVIEWS STRIP — social proof from xlightsseq.com
          ════════════════════════════════════════════════════ */}
      <section className="reviews-strip">
        <div className="reviews-strip-header">
          <span className="reviews-strip-title">What People Are Saying</span>
          <a
            href="https://xlightsseq.com/"
            className="reviews-strip-source"
            target="_blank"
            rel="noopener noreferrer"
          >
            via xlightsseq.com ↗
          </a>
        </div>
        <div className="reviews-strip-grid">
          <div className="review-card">
            <div
              className="review-stars"
              role="img"
              aria-label="5 out of 5 stars"
            >
              ★★★★★
            </div>
            <p className="review-quote">
              &ldquo;My kiddo&apos;s favorite song so had to find a sequence for
              it and this one hit just right. Love the classic Skeleton Dance
              video and good timing of effects with the dub step.&rdquo;
            </p>
            <div className="review-meta">
              <span className="review-user">Anonymous</span>
              <span className="review-date">Nov 2025</span>
            </div>
          </div>

          <div className="review-card">
            <div
              className="review-stars"
              role="img"
              aria-label="5 out of 5 stars"
            >
              ★★★★★
            </div>
            <p className="review-quote">
              &ldquo;Pretty dang good, and easy to apply&rdquo;
            </p>
            <div className="review-meta">
              <span className="review-user">chromewolf7</span>
              <span className="review-date">Sep 2025</span>
            </div>
          </div>

          <div className="review-card">
            <div
              className="review-stars"
              role="img"
              aria-label="5 out of 5 stars"
            >
              ★★★★★
            </div>
            <p className="review-quote">&ldquo;Great Job on this.&rdquo;</p>
            <div className="review-meta">
              <span className="review-user">joeally06</span>
              <span className="review-date">Sep 2025</span>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          STATS BAR — slim credibility strip
          ════════════════════════════════════════════════════ */}
      <div className="stats-bar">
        <div className="stats-bar-inner">
          <span className="stats-bar-item">
            <strong>35k+</strong> pixels
          </span>
          <span className="stats-bar-sep">·</span>
          <span className="stats-bar-item">
            <strong>20</strong> original sequences
          </span>
          <span className="stats-bar-sep">·</span>
          <span className="stats-bar-item">
            <strong>62</strong> songs in the playlist
          </span>
          <span className="stats-bar-sep">·</span>
          <span className="stats-bar-item">
            <strong>FM 87.9</strong> tune in live
          </span>
        </div>
      </div>

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
