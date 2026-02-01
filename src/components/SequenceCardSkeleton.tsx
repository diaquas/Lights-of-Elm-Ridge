'use client';

/**
 * Skeleton loading component for sequence cards
 * Displays an animated placeholder while content loads
 */
export default function SequenceCardSkeleton() {
  return (
    <div className="bg-surface rounded-xl overflow-hidden border border-border">
      {/* Thumbnail skeleton */}
      <div className="aspect-video relative overflow-hidden bg-surface-light">
        <div className="absolute inset-0 skeleton" />
      </div>

      {/* Content skeleton */}
      <div className="p-4">
        {/* Title */}
        <div className="h-5 bg-surface-light rounded skeleton mb-2 w-3/4" />

        {/* Artist */}
        <div className="h-4 bg-surface-light rounded skeleton mb-3 w-1/2" />

        {/* Tags row */}
        <div className="flex gap-2 mb-3">
          <div className="h-6 w-16 bg-surface-light rounded-full skeleton" />
          <div className="h-6 w-20 bg-surface-light rounded-full skeleton" />
        </div>

        {/* CTA skeleton */}
        <div className="pt-3 border-t border-border/50">
          <div className="h-4 bg-surface-light rounded skeleton w-24" />
        </div>
      </div>
    </div>
  );
}

/**
 * Grid of skeleton cards for loading state
 */
export function SequenceGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SequenceCardSkeleton key={i} />
      ))}
    </div>
  );
}
