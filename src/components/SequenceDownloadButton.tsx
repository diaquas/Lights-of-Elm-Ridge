"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface SequenceDownloadButtonProps {
  sequenceId: number;
  hasR2Url: boolean;
}

export default function SequenceDownloadButton({
  sequenceId,
  hasR2Url,
}: SequenceDownloadButtonProps) {
  const [hasPurchased, setHasPurchased] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    async function checkPurchase() {
      const supabase = createClient();
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      // Check if user has purchased this sequence
      const { data: purchases } = await supabase
        .from("purchases")
        .select("sequence_ids")
        .eq("user_id", user.id);

      if (purchases) {
        const purchased = purchases.some((p: { sequence_ids: number[] }) =>
          p.sequence_ids.includes(sequenceId),
        );
        setHasPurchased(purchased);
      }

      setIsLoading(false);
    }

    checkPurchase();
  }, [sequenceId]);

  const handleDownload = async () => {
    setIsDownloading(true);

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Not authenticated");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
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
      setIsDownloading(false);
    }
  };

  // Don't render anything while loading or if not purchased
  if (isLoading || !hasPurchased) {
    return null;
  }

  // User has purchased - show download button
  return (
    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-3 mb-3">
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
        <span className="text-green-500 font-semibold">
          You own this sequence
        </span>
      </div>
      {hasR2Url ? (
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 text-white font-semibold rounded-lg transition-colors"
        >
          {isDownloading ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
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
              Preparing download...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
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
              Download Your Sequence
            </>
          )}
        </button>
      ) : (
        <p className="text-sm text-foreground/60 italic">
          Download will be available soon
        </p>
      )}
    </div>
  );
}
