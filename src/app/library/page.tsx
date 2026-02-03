"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { sequences, getThumbnailUrl } from "@/data/sequences";

interface Purchase {
  id: string;
  sequence_ids: number[];
  created_at: string;
  amount_total: number;
}

interface PurchasedSequence {
  id: number;
  slug: string;
  title: string;
  artist: string;
  category: "Halloween" | "Christmas";
  thumbnailUrl: string | null;
  youtubeId: string | null;
  r2Url?: string;
  purchaseDate: string;
}

export default function LibraryPage() {
  const [purchasedSequences, setPurchasedSequences] = useState<
    PurchasedSequence[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    async function loadPurchases() {
      const supabase = createClient();
      if (!supabase) {
        setError("Failed to initialize");
        setIsLoading(false);
        return;
      }

      // Check if user is logged in
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      setUser({ id: user.id, email: user.email });

      // Fetch user's purchases
      const { data: purchases, error: fetchError } = await supabase
        .from("purchases")
        .select("id, sequence_ids, created_at, amount_total")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError("Failed to load purchases");
        setIsLoading(false);
        return;
      }

      // Map sequence IDs to sequence data
      const allPurchasedIds = new Set<number>();
      const purchaseDates = new Map<number, string>();

      (purchases as Purchase[]).forEach((purchase) => {
        purchase.sequence_ids.forEach((id) => {
          allPurchasedIds.add(id);
          if (!purchaseDates.has(id)) {
            purchaseDates.set(id, purchase.created_at);
          }
        });
      });

      const purchased = sequences
        .filter((seq) => allPurchasedIds.has(seq.id))
        .map((seq) => ({
          id: seq.id,
          slug: seq.slug,
          title: seq.title,
          artist: seq.artist,
          category: seq.category,
          thumbnailUrl: seq.thumbnailUrl || getThumbnailUrl(seq.youtubeId),
          youtubeId: seq.youtubeId,
          r2Url: seq.r2Url,
          purchaseDate: purchaseDates.get(seq.id) || "",
        }));

      setPurchasedSequences(purchased);
      setIsLoading(false);
    }

    loadPurchases();
  }, []);

  const handleDownload = async (sequenceId: number) => {
    setDownloadingId(sequenceId);

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Not authenticated");

      // Validate the session first (getUser validates server-side)
      const {
        data: { user: validUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !validUser) {
        throw new Error("Please sign in again to download");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Session expired - please sign in again");
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-download-url`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            ...(session?.access_token && {
              Authorization: `Bearer ${session.access_token}`,
            }),
          },
          body: JSON.stringify({ sequenceId }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get download link");
      }

      // Open download URL in new tab
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Download error:", err);
      alert(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">My Library</h1>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">My Library</h1>
          <div className="bg-surface rounded-xl border border-border p-12 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-xl font-semibold mb-2">
              Sign in to view your library
            </h2>
            <p className="text-foreground/60 mb-6">
              Your purchased sequences will appear here after you sign in.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">My Library</h1>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (purchasedSequences.length === 0) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">My Library</h1>
          <div className="bg-surface rounded-xl border border-border p-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-xl font-semibold mb-2">No sequences yet</h2>
            <p className="text-foreground/60 mb-6">
              Sequences you purchase will appear here for easy download.
            </p>
            <Link
              href="/sequences"
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl transition-colors"
            >
              Browse Sequences
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">My Library</h1>
        <p className="text-foreground/60 mb-8">
          {purchasedSequences.length} sequence
          {purchasedSequences.length !== 1 ? "s" : ""} purchased
        </p>

        <div className="space-y-4">
          {purchasedSequences.map((seq) => (
            <div
              key={seq.id}
              className="bg-surface rounded-xl border border-border p-4 flex gap-4"
            >
              {/* Thumbnail */}
              <Link
                href={`/sequences/${seq.slug}`}
                className="shrink-0 w-24 h-24 bg-surface-light rounded-lg overflow-hidden relative"
              >
                {seq.thumbnailUrl ? (
                  <Image
                    src={seq.thumbnailUrl}
                    alt={`${seq.title} - ${seq.artist}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl">
                      {seq.category === "Halloween" ? "🎃" : "🎄"}
                    </span>
                  </div>
                )}
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/sequences/${seq.slug}`}
                  className="font-semibold hover:text-accent transition-colors line-clamp-1"
                >
                  {seq.title}
                </Link>
                <p className="text-sm text-foreground/60">{seq.artist}</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-surface-light rounded-full border border-border">
                  {seq.category}
                </span>
                <p className="text-xs text-foreground/40 mt-2">
                  Purchased {new Date(seq.purchaseDate).toLocaleDateString()}
                </p>
              </div>

              {/* Download */}
              <div className="flex items-center">
                {seq.r2Url ? (
                  <button
                    onClick={() => handleDownload(seq.id)}
                    disabled={downloadingId === seq.id}
                    className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white font-semibold rounded-lg transition-colors"
                  >
                    {downloadingId === seq.id ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Loading...
                      </>
                    ) : (
                      <>
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
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        Download
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-sm text-foreground/40 italic">
                    Coming soon
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-8 border-t border-border">
          <Link
            href="/sequences"
            className="flex items-center gap-2 text-accent hover:text-accent-secondary transition-colors"
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
            Browse more sequences
          </Link>
        </div>
      </div>
    </div>
  );
}
