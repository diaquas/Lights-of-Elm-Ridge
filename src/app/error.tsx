'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console in development
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Error Icon */}
        <div className="text-8xl mb-6">💥</div>

        <h1 className="text-4xl font-bold mb-4">
          <span className="gradient-text">Something Went Wrong</span>
        </h1>

        <p className="text-foreground/60 mb-8">
          The lights flickered and something broke. Don&apos;t worry, it&apos;s probably just a loose connection.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-accent hover:bg-accent/80 text-white font-semibold rounded-xl transition-colors"
          >
            Try Again
          </button>
          <a
            href="/"
            className="px-6 py-3 bg-surface hover:bg-surface-light border border-border text-foreground font-semibold rounded-xl transition-colors"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
