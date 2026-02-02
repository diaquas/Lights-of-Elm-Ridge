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

  // Get mockup video from YouTube playlist (preferred) or fall back to sequence.youtubeId
  const mockupVideoId = getMockupVideoId(slug);
  const videoId = mockupVideoId || sequence.youtubeId;

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
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm">
            <ol className="flex items-center gap-2 text-foreground/60">
              <li>
                <Link href="/" className="hover:text-accent">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/sequences" className="hover:text-accent">
                  Sequences
                </Link>
              </li>
              <li>/</li>
              <li className="text-foreground">{sequence.title}</li>
            </ol>
          </nav>

          {/* Main Product Section */}
          <div className="grid lg:grid-cols-2 gap-12 mb-16">
            {/* Left: Album Art / Thumbnail */}
            <div className="space-y-4">
              <div className="aspect-square bg-surface rounded-xl border border-border overflow-hidden relative">
                {sequence.artworkUrl || sequence.youtubeId ? (
                  <Image
                    src={
                      sequence.artworkUrl ||
                      getThumbnailUrl(sequence.youtubeId) ||
                      ""
                    }
                    alt={`${sequence.title} - ${sequence.artist}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent/10 to-surface">
                    <div className="text-center p-8">
                      <span className="text-9xl block mb-4">
                        {sequence.category === "Halloween" ? "🎃" : "🎄"}
                      </span>
                      <p className="text-foreground/40 text-sm">
                        Video preview coming soon
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {sequence.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-surface rounded-full text-xs text-foreground/60 border border-border"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Product Info */}
            <div>
              {/* Header */}
              <div className="mb-6">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  {sequence.title} - {sequence.artist}
                </h1>
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-bold text-accent">
                    {sequence.price === 0 ? "FREE" : `$${sequence.price}`}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm bg-surface border border-border">
                    {sequence.category}
                  </span>
                </div>
              </div>

              {/* Video Preview - prefers mockup videos from YouTube playlist */}
              {videoId && (
                <div className="mb-6">
                  <div className="aspect-video rounded-xl overflow-hidden border border-border">
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title={`${sequence.title} - ${sequence.artist} Preview`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                  {mockupVideoId && (
                    <p className="text-xs text-foreground/40 mt-2 text-center">
                      xLights mockup preview
                    </p>
                  )}
                </div>
              )}

              {/* Important Notice */}
              <div className="bg-surface-light rounded-xl p-4 mb-6 border border-border">
                <p className="text-sm text-foreground/70">
                  {sequence.r2Url || sequence.googleDriveUrl ? (
                    <>
                      <span className="font-semibold text-accent">
                        Direct download available
                      </span>{" "}
                      — This sequence contains programming for the props listed
                      below. Audio file must be purchased separately.
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-accent">
                        Currently available on xlightsseq.com
                      </span>{" "}
                      — This sequence contains programming for the props listed
                      below. Purchase allows sequence data to be used in a
                      single residential non-commercial display.
                    </>
                  )}
                </p>
              </div>

              {/* Description */}
              <div className="mb-6">
                <p className="text-foreground/70 leading-relaxed">
                  {sequence.description}
                </p>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-surface rounded-lg p-3 text-center border border-border">
                  <div className="text-lg font-bold text-foreground">
                    {sequence.duration}
                  </div>
                  <div className="text-xs text-foreground/50">Duration</div>
                </div>
                <div className="bg-surface rounded-lg p-3 text-center border border-border">
                  <div className="text-lg font-bold text-foreground">
                    {sequence.difficulty}
                  </div>
                  <div className="text-xs text-foreground/50">Difficulty</div>
                </div>
                <div className="bg-surface rounded-lg p-3 text-center border border-border">
                  <div className="text-lg font-bold text-foreground">
                    {sequence.propCount}+
                  </div>
                  <div className="text-xs text-foreground/50">Props</div>
                </div>
              </div>

              {/* Audio Source */}
              <div className="mb-6 p-4 bg-surface rounded-xl border border-border">
                <div className="text-sm">
                  <span className="font-semibold text-foreground">
                    Purchase the audio:
                  </span>{" "}
                  {sequence.amazonMusicUrl ? (
                    <a
                      href={sequence.amazonMusicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-accent hover:text-accent-secondary transition-colors"
                    >
                      Amazon Music
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  ) : (
                    <span className="text-foreground/60">
                      {sequence.audioSource}
                    </span>
                  )}
                </div>
              </div>

              {/* Download/Buy Button */}
              <div className="space-y-3">
                {sequence.r2Url || sequence.googleDriveUrl ? (
                  sequence.price === 0 ? (
                    // Free download
                    <>
                      <a
                        href={
                          sequence.r2Url ||
                          getGoogleDriveDownloadUrl(sequence.googleDriveUrl) ||
                          "#"
                        }
                        className="flex items-center justify-center gap-2 w-full py-4 bg-accent hover:bg-accent/90 text-white text-center font-semibold rounded-xl transition-all text-lg"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
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
                          className="flex items-center justify-center gap-2 w-full py-3 bg-surface hover:bg-surface-light text-foreground text-center font-medium rounded-xl transition-all border border-border"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                            />
                          </svg>
                          Purchase Audio on Amazon
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      )}
                      <div className="flex items-center justify-center gap-2 text-foreground/50 text-xs">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>
                          Audio file not included — purchase separately
                        </span>
                      </div>
                    </>
                  ) : (
                    // Paid sequence - Add to Cart
                    <>
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
                      />
                      {sequence.amazonMusicUrl && (
                        <a
                          href={sequence.amazonMusicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-3 bg-surface hover:bg-surface-light text-foreground text-center font-medium rounded-xl transition-all border border-border"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                            />
                          </svg>
                          Purchase Audio on Amazon
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      )}
                      <div className="flex items-center justify-center gap-2 text-foreground/50 text-xs">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>
                          Audio file not included — purchase separately
                        </span>
                      </div>
                    </>
                  )
                ) : sequence.xlightsSeqUrl ? (
                  <>
                    <a
                      href={sequence.xlightsSeqUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-4 bg-accent hover:bg-accent/90 text-white text-center font-semibold rounded-xl transition-all text-lg"
                    >
                      {sequence.price === 0
                        ? "Download Free"
                        : `Buy Now - $${sequence.price}`}
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                    <div className="flex items-center justify-center gap-2 text-foreground/50 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>Secure checkout on xlightsseq.com</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center gap-2 w-full py-4 bg-surface text-foreground/50 text-center font-semibold rounded-xl border border-border">
                    Coming Soon
                  </div>
                )}
              </div>

              {/* Share */}
              <div className="mt-6 pt-6 border-t border-border">
                <div
                  className="flex items-center gap-4"
                  role="group"
                  aria-label="Share options"
                >
                  <span className="text-sm text-foreground/60">Share:</span>
                  <div className="flex gap-3">
                    <button
                      className="p-2 rounded-lg bg-surface hover:bg-surface-light transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
                      aria-label="Share on Facebook"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </button>
                    <button
                      className="p-2 rounded-lg bg-surface hover:bg-surface-light transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
                      aria-label="Share on X (Twitter)"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </button>
                    <button
                      className="p-2 rounded-lg bg-surface hover:bg-surface-light transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
                      aria-label="Copy link to clipboard"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Info Sections */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* What's Included */}
            <div className="bg-surface rounded-xl p-6 border border-border">
              <h2 className="text-xl font-bold mb-4">What&apos;s Included</h2>
              <ul className="space-y-2 text-foreground/70">
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
                  Lifetime access to download
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
                  Compatible with xLights {sequence.xlightsVersion}
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

          {/* Full Description */}
          <div className="bg-surface rounded-xl p-8 border border-border mb-16">
            <h2 className="text-xl font-bold mb-4">About This Sequence</h2>
            <div className="prose prose-invert max-w-none">
              {sequence.longDescription.split("\n\n").map((paragraph, i) => (
                <p
                  key={i}
                  className="text-foreground/70 mb-4 whitespace-pre-line"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* You May Also Like */}
          {relatedSequences.length > 0 && (
            <div className="mb-16">
              <h2 className="text-2xl font-bold mb-8">You may also like</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
                      {related.price === 0 ? "FREE" : `$${related.price}`}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Trust Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8 border-t border-border">
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

          {/* Back to All */}
          <div className="text-center pt-8">
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
    </>
  );
}
