'use client';

/**
 * Skeleton loading component for YouTube embeds
 * Shows a pulsing placeholder with play button indicator
 */
export default function YouTubeEmbedSkeleton() {
  return (
    <div className="aspect-video relative overflow-hidden bg-surface-light rounded-xl border border-border">
      <div className="absolute inset-0 skeleton" />

      {/* Play button placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-12 bg-surface/80 rounded-xl flex items-center justify-center">
          <svg
            className="w-8 h-8 text-foreground/40"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* Loading text */}
      <div className="absolute bottom-4 left-4">
        <span className="text-foreground/40 text-sm">Loading video...</span>
      </div>
    </div>
  );
}
