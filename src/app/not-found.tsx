import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* 404 Icon */}
        <div className="text-8xl mb-6">👻</div>

        <h1 className="text-4xl font-bold mb-4">
          <span className="gradient-text">Page Not Found</span>
        </h1>

        <p className="text-foreground/60 mb-6">
          Looks like this page vanished into the night. Maybe it&apos;s hiding
          with the other Halloween decorations?
        </p>

        {/* Helpful suggestions */}
        <div className="bg-surface rounded-xl p-4 mb-8 border border-border text-left">
          <p className="text-sm text-foreground/70 mb-2 font-medium">
            Try one of these:
          </p>
          <ul className="text-sm text-foreground/60 space-y-1">
            <li>• Check the URL for typos</li>
            <li>
              • Use the search on the{" "}
              <Link href="/sequences" className="text-accent hover:underline">
                sequences page
              </Link>
            </li>
            <li>
              • Browse our{" "}
              <Link href="/sequences" className="text-accent hover:underline">
                full sequence catalog
              </Link>
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-accent hover:bg-accent/80 text-white font-semibold rounded-lg transition-colors"
          >
            Back to Home
          </Link>
          <Link
            href="/sequences"
            className="px-6 py-3 bg-surface hover:bg-surface-light border border-border text-foreground font-semibold rounded-lg transition-colors"
          >
            Browse Sequences
          </Link>
        </div>
      </div>
    </div>
  );
}
