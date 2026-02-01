'use client';

import { useState, useCallback } from 'react';
import YouTubeEmbedSkeleton from './YouTubeEmbedSkeleton';

interface YouTubeEmbedProps {
  videoId: string;
  title: string;
  className?: string;
}

/**
 * YouTube embed component with loading state
 * Shows skeleton while iframe loads
 */
export default function YouTubeEmbed({ videoId, title, className = '' }: YouTubeEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 z-10">
          <YouTubeEmbedSkeleton />
        </div>
      )}

      {/* Iframe */}
      <div className={`aspect-video rounded-xl overflow-hidden border border-border transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
          onLoad={handleLoad}
        />
      </div>
    </div>
  );
}
