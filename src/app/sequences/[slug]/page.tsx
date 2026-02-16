import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getSequenceBySlug,
  getRelatedSequences,
  getAllSlugs,
  getThumbnailUrl,
  getGoogleDriveDownloadUrl,
} from "@/data/sequences";
import { getMockupVideoId } from "@/data/youtube-loader";
import AddToCartButton from "@/components/AddToCartButton";
import SequenceDownloadButton from "@/components/SequenceDownloadButton";
import ShareButtons from "@/components/ShareButtons";

function generateProductSchema(
  sequence: NonNullable<ReturnType<typeof getSequenceBySlug>>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${sequence.title} - ${sequence.artist} xLights Sequence`,
    description: sequence.description,
    image:
      sequence.artworkUrl ||
      (sequence.youtubeId
        ? getThumbnailUrl(sequence.youtubeId)
        : "https://lightsofelmridge.com/logo.jpg"),
    brand: {
      "@type": "Brand",
      name: "Lights of Elm Ridge",
    },
    offers: {
      "@type": "Offer",
      url: `https://lightsofelmridge.com/sequences/${sequence.slug}`,
      priceCurrency: "USD",
      price: sequence.price,
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "Lights of Elm Ridge",
      },
    },
    category: `${sequence.category} xLights Sequence`,
  };
}

function generateBreadcrumbSchema(
  sequence: NonNullable<ReturnType<typeof getSequenceBySlug>>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://lightsofelmridge.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Sequences",
        item: "https://lightsofelmridge.com/sequences",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${sequence.title} - ${sequence.artist}`,
        item: `https://lightsofelmridge.com/sequences/${sequence.slug}`,
      },
    ],
  };
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sequence = getSequenceBySlug(slug);

  if (!sequence) {
    return { title: "Sequence Not Found" };
  }

  const imageUrl: string =
    sequence.artworkUrl ||
    (sequence.youtubeId ? getThumbnailUrl(sequence.youtubeId) : "/logo.jpg") ||
    "/logo.jpg";

  return {
    title: `${sequence.title} - ${sequence.artist} | Light of Elm Ridge`,
    description: sequence.description,
    openGraph: {
      title: `${sequence.title} - ${sequence.artist} xLights Sequence`,
      description: sequence.description,
      type: "website",
      url: `https://lightsofelmridge.com/sequences/${sequence.slug}`,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${sequence.title} by ${sequence.artist}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${sequence.title} - ${sequence.artist}`,
      description: sequence.description,
      images: [imageUrl],
    },
    alternates: {
      canonical: `https://lightsofelmridge.com/sequences/${sequence.slug}`,
    },
  };
}

export default async function SequencePage({ params }: PageProps) {
  const { slug } = await params;
  const sequence = getSequenceBySlug(slug);

  if (!sequence) {
    notFound();
  }

  // Prefer explicit youtubeId on sequence, fall back to mockup matching
  const mockupVideoId = getMockupVideoId(slug);
  const videoId = sequence.youtubeId || mockupVideoId;

  const relatedSequences = getRelatedSequences(slug, 4);
  const productSchema = generateProductSchema(sequence);
  const breadcrumbSchema = generateBreadcrumbSchema(sequence);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div className="seq-detail-page min-h-screen">
        <div className="seq-detail-content">
          {/* Breadcrumb */}
          <nav
            className="max-w-[1100px] mx-auto px-4 md:px-8 pt-5 seq-anim-in seq-delay-1"
            aria-label="Breadcrumb"
          >
            <ol className="flex items-center gap-2 text-[13px] text-[#63636e]">
              <li>
                <Link
                  href="/"
                  className="hover:text-[#a1a1aa] transition-colors"
                >
                  Home
                </Link>
              </li>
              <li className="opacity-35 text-[11px]">/</li>
              <li>
                <Link
                  href="/sequences"
                  className="hover:text-[#a1a1aa] transition-colors"
                >
                  Sequences
                </Link>
              </li>
              <li className="opacity-35 text-[11px]">/</li>
              <li className="text-[#a1a1aa]">{sequence.title}</li>
            </ol>
          </nav>

          {/* Main Product Section */}
          <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-7 pb-20">
            <div className="grid md:grid-cols-2 gap-8 lg:gap-11 items-start mb-16">
              {/* ════════════ LEFT COLUMN ════════════ */}
              <div className="flex flex-col gap-[18px]">
                {/* Album art with price chip */}
                <div
                  className="seq-album-wrap relative rounded-[14px] overflow-hidden aspect-square bg-[#111] border border-[#27272a] cursor-pointer seq-anim-in seq-delay-2"
                  tabIndex={0}
                  role="img"
                  aria-label={`Album artwork for ${sequence.title} by ${sequence.artist}`}
                >
                  {sequence.artworkUrl || sequence.youtubeId ? (
                    <Image
                      src={
                        sequence.artworkUrl ||
                        getThumbnailUrl(sequence.youtubeId) ||
                        ""
                      }
                      alt={`${sequence.title} - ${sequence.artist}`}
                      fill
                      className="seq-album-art object-cover"
                      unoptimized
                      priority
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent/10 to-[#151518]">
                      <div className="text-center p-8">
                        <span className="text-9xl block mb-4">
                          {sequence.category === "Halloween" ? "🎃" : "🎄"}
                        </span>
                        <p className="text-[#63636e] text-sm">
                          Preview coming soon
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Price chip */}
                  <span className="seq-price-chip absolute top-4 left-4 z-10 bg-accent text-white font-display font-bold text-[15px] px-4 py-1.5 rounded-full tracking-tight">
                    {sequence.price === 0 ? "Free" : `$${sequence.price}`}
                  </span>
                </div>

                {/* Song title + artist */}
                <div className="seq-anim-in seq-delay-3">
                  <h1 className="font-display text-[32px] md:text-[36px] font-extrabold tracking-tight leading-tight text-[#f4f4f5]">
                    {sequence.title}
                  </h1>
                  <p className="text-[15px] text-[#a1a1aa] mt-1">
                    {sequence.artist}
                  </p>
                </div>

                {/* Tags */}
                <div
                  className="flex flex-wrap gap-2 seq-anim-in seq-delay-4"
                  aria-label="Tags"
                >
                  {sequence.tags.map((tag) => (
                    <span
                      key={tag}
                      className="seq-tag bg-[rgba(255,255,255,0.06)] text-[#c4c4cc] text-[12.5px] font-medium px-3 py-1 rounded-full border border-[rgba(255,255,255,0.08)] cursor-default"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* ════════════ RIGHT COLUMN ════════════ */}
              <div className="flex flex-col gap-[18px]">
                {/* Video preview */}
                {videoId && (
                  <div className="seq-anim-in seq-delay-3">
                    <div className="seq-video-wrap relative rounded-[14px] overflow-hidden aspect-video bg-black border border-[#27272a]">
                      <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title={`${sequence.title} - ${sequence.artist} Preview`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    </div>
                    <p className="text-center text-[12px] text-[#63636e] mt-1.5">
                      xLights mockup preview
                    </p>
                  </div>
                )}

                {/* Description */}
                <p className="text-[14.5px] text-[#a1a1aa] leading-relaxed seq-anim-in seq-delay-4">
                  {sequence.description}
                </p>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2.5 seq-anim-in seq-delay-5">
                  <div className="seq-stat-card bg-[#151518] border border-[#27272a] rounded-lg p-3.5 text-center">
                    <div className="font-display text-[17px] font-bold text-[#f4f4f5] tracking-tight">
                      {sequence.duration}
                    </div>
                    <div className="text-[11px] text-[#63636e] mt-1 uppercase tracking-wider font-medium">
                      Duration
                    </div>
                  </div>
                  <div className="seq-stat-card bg-[#151518] border border-[#27272a] rounded-lg p-3.5 text-center">
                    <div className="font-display text-[17px] font-bold text-[#f4f4f5] tracking-tight">
                      {sequence.difficulty}
                    </div>
                    <div className="text-[11px] text-[#63636e] mt-1 uppercase tracking-wider font-medium">
                      Difficulty
                    </div>
                  </div>
                  <div className="seq-stat-card bg-[#151518] border border-[#27272a] rounded-lg p-3.5 text-center">
                    <div className="font-display text-[17px] font-bold text-[#f4f4f5] tracking-tight">
                      {sequence.propCount}+
                    </div>
                    <div className="text-[11px] text-[#63636e] mt-1 uppercase tracking-wider font-medium">
                      Props
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <hr className="border-[#27272a] my-0.5 seq-anim-in seq-delay-6" />

                {/* Action buttons */}
                <div className="flex flex-col gap-2.5 seq-anim-in seq-delay-7">
                  {sequence.r2Url || sequence.googleDriveUrl ? (
                    sequence.price === 0 ? (
                      <>
                        <a
                          href={
                            sequence.r2Url ||
                            getGoogleDriveDownloadUrl(
                              sequence.googleDriveUrl,
                            ) ||
                            "#"
                          }
                          className="seq-btn-primary flex items-center justify-center gap-2 w-full py-3.5 px-5 bg-accent hover:bg-accent/90 text-white text-center font-semibold rounded-lg text-[14.5px]"
                        >
                          <svg
                            className="w-[17px] h-[17px]"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.2}
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                          Download Free Sequence
                        </a>
                        {sequence.amazonMusicUrl && (
                          <a
                            href={sequence.amazonMusicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="seq-btn-secondary flex items-center justify-center gap-2 w-full py-3.5 px-5 bg-[#151518] hover:bg-[#1c1c20] text-[#f4f4f5] text-center font-semibold rounded-lg text-[14.5px] border border-[#27272a]"
                          >
                            <svg
                              className="w-[15px] h-[15px]"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2.2}
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                              />
                            </svg>
                            Purchase Audio on Amazon
                            <svg
                              className="w-3 h-3 opacity-50"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2.2}
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </a>
                        )}
                      </>
                    ) : (
                      <SequenceDownloadButton
                        sequenceId={sequence.id}
                        hasR2Url={!!sequence.r2Url}
                      >
                        <AddToCartButton
                          sequence={{
                            id: sequence.id,
                            slug: sequence.slug,
                            title: sequence.title,
                            artist: sequence.artist,
                            price: sequence.price,
                            category: sequence.category,
                            thumbnailUrl:
                              sequence.thumbnailUrl ||
                              sequence.artworkUrl ||
                              getThumbnailUrl(sequence.youtubeId),
                          }}
                          className="seq-btn-primary flex items-center justify-center gap-2 w-full py-3.5 px-5 bg-accent hover:bg-accent/90 text-white text-center font-semibold rounded-lg text-[14.5px]"
                        />
                        {sequence.amazonMusicUrl && (
                          <a
                            href={sequence.amazonMusicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="seq-btn-secondary flex items-center justify-center gap-2 w-full py-3.5 px-5 bg-[#151518] hover:bg-[#1c1c20] text-[#f4f4f5] text-center font-semibold rounded-lg text-[14.5px] border border-[#27272a] mt-2.5"
                          >
                            <svg
                              className="w-[15px] h-[15px]"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2.2}
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                              />
                            </svg>
                            Purchase Audio on Amazon
                            <svg
                              className="w-3 h-3 opacity-50"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2.2}
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </a>
                        )}
                      </SequenceDownloadButton>
                    )
                  ) : sequence.xlightsSeqUrl ? (
                    <a
                      href={sequence.xlightsSeqUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="seq-btn-primary flex items-center justify-center gap-2 w-full py-3.5 px-5 bg-accent hover:bg-accent/90 text-white text-center font-semibold rounded-lg text-[14.5px]"
                    >
                      <svg
                        className="w-[17px] h-[17px]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.2}
                        viewBox="0 0 24 24"
                      >
                        <circle cx="9" cy="21" r="1" />
                        <circle cx="20" cy="21" r="1" />
                        <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
                      </svg>
                      {sequence.price === 0
                        ? "Download Free"
                        : `Add to Cart — $${sequence.price}`}
                    </a>
                  ) : (
                    <div className="flex items-center justify-center gap-2 w-full py-3.5 px-5 bg-[#151518] text-[#63636e] text-center font-semibold rounded-lg text-[14.5px] border border-[#27272a]">
                      Coming Soon
                    </div>
                  )}
                </div>

                {/* Audio disclaimer */}
                <div className="flex items-center justify-center gap-1.5 text-[#63636e] text-[12px] seq-anim-in seq-delay-8">
                  <svg
                    className="w-[13px] h-[13px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  Audio file not included — purchase separately
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Info Sections */}
          <div className="max-w-[1100px] mx-auto px-4 md:px-8">
            <div className="grid md:grid-cols-2 gap-8 mb-16">
              {/* Left Column: What's Included + Props & Models */}
              <div className="flex flex-col gap-6">
                {/* What's Included */}
                <div className="bg-surface rounded-xl p-6 border border-border">
                  <h2 className="text-xl font-bold mb-4">
                    What&apos;s Included
                  </h2>
                  <ul className="space-y-2 text-foreground/70">
                    <li className="flex items-center gap-2">
                      <Image
                        src="/modiq-wordmark-v3-full.png"
                        alt="Mod:IQ"
                        width={20}
                        height={20}
                        className="w-5 h-5 object-contain"
                        unoptimized
                      />
                      Mod:IQ auto-mapping
                    </li>
                    {sequence.fileFormats.map((format) => (
                      <li key={format} className="flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-green-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {format}
                      </li>
                    ))}
                    <li className="flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      All Videos
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      All Images
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Lifetime access to download
                    </li>
                  </ul>
                </div>

                {/* Props/Models */}
                <div className="bg-surface rounded-xl p-6 border border-border">
                  <h2 className="text-xl font-bold mb-4">Props & Models</h2>
                  <div className="flex flex-wrap gap-2">
                    {sequence.models.map((model) => (
                      <span
                        key={model}
                        className="px-3 py-1 bg-surface-light rounded-lg text-sm text-foreground/70 border border-border"
                      >
                        {model}
                      </span>
                    ))}
                  </div>
                  {sequence.hasMatrix && (
                    <p className="mt-4 text-sm text-accent">
                      ✓ Includes Matrix effects
                    </p>
                  )}
                </div>
              </div>

              {/* Right Column: About This Sequence */}
              <div className="bg-surface rounded-xl p-6 border border-border h-fit">
                <h2 className="text-xl font-bold mb-4">About This Sequence</h2>
                <div className="prose prose-invert max-w-none">
                  {sequence.longDescription
                    .split("\n\n")
                    .map((paragraph, i) => (
                      <p
                        key={i}
                        className="text-foreground/70 mb-4 whitespace-pre-line"
                      >
                        {paragraph}
                      </p>
                    ))}
                </div>
              </div>
            </div>

            {/* You May Also Like */}
            {relatedSequences.length > 0 && (
              <div className="mb-16">
                <h2 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8">
                  You may also like
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                  {relatedSequences.map((related) => (
                    <Link
                      key={related.id}
                      href={`/sequences/${related.slug}`}
                      className="group"
                    >
                      <div className="aspect-square bg-surface rounded-xl border border-border overflow-hidden mb-3 group-hover:border-accent/50 transition-colors relative">
                        {related.artworkUrl || related.youtubeId ? (
                          <Image
                            src={
                              related.artworkUrl ||
                              getThumbnailUrl(related.youtubeId) ||
                              ""
                            }
                            alt={`${related.title} - ${related.artist}`}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                            unoptimized
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent/10 to-surface">
                            <span className="text-6xl">
                              {related.category === "Halloween" ? "🎃" : "🎄"}
                            </span>
                          </div>
                        )}
                      </div>
                      <h3 className="font-medium group-hover:text-accent transition-colors line-clamp-2">
                        {related.title} - {related.artist}
                      </h3>
                      <p className="text-accent font-semibold">
                        {related.price === 0 ? "Free" : `$${related.price}`}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Trust Badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 py-6 sm:py-8 border-t border-border">
              <div className="text-center">
                <div className="text-2xl mb-2">🎬</div>
                <h3 className="font-semibold text-sm">Video Previews</h3>
                <p className="text-xs text-foreground/50">See before you buy</p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">⚡</div>
                <h3 className="font-semibold text-sm">Instant Download</h3>
                <p className="text-xs text-foreground/50">
                  Get started immediately
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">💬</div>
                <h3 className="font-semibold text-sm">Support</h3>
                <p className="text-xs text-foreground/50">
                  We&apos;re here to help
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">✅</div>
                <h3 className="font-semibold text-sm">Tested & Ready</h3>
                <p className="text-xs text-foreground/50">
                  Runs on real displays
                </p>
              </div>
            </div>

            {/* Share Section */}
            <div className="flex items-center justify-center gap-3 py-6 border-t border-border">
              <span className="text-[13px] text-foreground/50 font-medium">
                Share this sequence
              </span>
              <ShareButtons
                url={`https://lightsofelmridge.com/sequences/${sequence.slug}`}
                title={`${sequence.title} - ${sequence.artist} xLights Sequence`}
                description={sequence.description}
              />
            </div>

            {/* Back to All */}
            <div className="text-center pt-4 pb-8">
              <Link
                href="/sequences"
                className="inline-flex items-center gap-2 text-accent hover:text-accent-secondary transition-colors"
              >
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to all sequences
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
