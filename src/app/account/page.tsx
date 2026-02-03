"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { sequences, getThumbnailUrl } from "@/data/sequences";
import type { User } from "@supabase/supabase-js";

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
  r2Url?: string;
  purchaseDate: string;
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasedSequences, setPurchasedSequences] = useState<
    PurchasedSequence[]
  >([]);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!supabase) {
      router.push("/login");
      return;
    }

    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);

      // Fetch purchases
      const { data: purchases } = await supabase
        .from("purchases")
        .select("id, sequence_ids, created_at, amount_total")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (purchases) {
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
            r2Url: seq.r2Url,
            purchaseDate: purchaseDates.get(seq.id) || "",
          }));

        setPurchasedSequences(purchased);
      }

      setLoading(false);
    };

    loadData();
  }, [router, supabase]);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleDownload = async (sequenceId: number) => {
    setDownloadingId(sequenceId);

    try {
      if (!supabase) throw new Error("Not authenticated");

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
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ sequenceId }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get download link");
      }

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-foreground/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Account</h1>
          <p className="text-foreground/60">
            Manage your account and download your sequences
          </p>
        </div>

        {/* Account Info */}
        <div className="bg-surface rounded-xl p-6 border border-border mb-8">
          <h2 className="text-xl font-bold mb-4">Account Information</h2>
          <div className="space-y-3">
            <div>
              <span className="text-foreground/60 text-sm">Email</span>
              <p className="text-foreground">{user.email}</p>
            </div>
            <div>
              <span className="text-foreground/60 text-sm">Member since</span>
              <p className="text-foreground">
                {new Date(user.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Purchased Sequences */}
        <div className="bg-surface rounded-xl p-6 border border-border mb-8">
          <h2 className="text-xl font-bold mb-4">
            My Sequences
            {purchasedSequences.length > 0 && (
              <span className="text-base font-normal text-foreground/60 ml-2">
                ({purchasedSequences.length})
              </span>
            )}
          </h2>

          {purchasedSequences.length === 0 ? (
            <div className="text-center py-8 text-foreground/60">
              <svg
                className="w-12 h-12 mx-auto mb-4 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <p className="mb-4">
                You haven&apos;t purchased any sequences yet.
              </p>
              <Link
                href="/sequences"
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
              >
                Browse Sequences
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
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {purchasedSequences.map((seq) => (
                <div
                  key={seq.id}
                  className="bg-background rounded-lg border border-border p-3 sm:p-4 flex gap-3 sm:gap-4"
                >
                  {/* Thumbnail */}
                  <Link
                    href={`/sequences/${seq.slug}`}
                    className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-surface-light rounded-lg overflow-hidden relative"
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
                        <span className="text-3xl">
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
                    <p className="text-xs text-foreground/40 mt-1">
                      Purchased{" "}
                      {new Date(seq.purchaseDate).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Download */}
                  <div className="flex items-center">
                    {seq.r2Url ? (
                      <button
                        onClick={() => handleDownload(seq.id)}
                        disabled={downloadingId === seq.id}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-2 min-h-[44px] bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors"
                      >
                        {downloadingId === seq.id ? (
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
                      <span className="text-xs text-foreground/40 italic">
                        Coming soon
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <Link
            href="/"
            className="text-foreground/60 hover:text-foreground transition-colors"
          >
            &larr; Back to home
          </Link>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-surface hover:bg-surface-light text-foreground border border-border rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
