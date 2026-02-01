export default function TheShowLoading() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header skeleton */}
        <div className="text-center mb-12">
          <div className="h-12 w-72 bg-surface-light rounded skeleton mx-auto mb-4" />
          <div className="h-6 w-80 bg-surface-light rounded skeleton mx-auto" />
        </div>

        {/* Tabs skeleton */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-surface rounded-xl border border-border p-1 gap-2">
            <div className="h-12 w-36 bg-surface-light rounded-lg skeleton" />
            <div className="h-12 w-36 bg-surface-light rounded-lg skeleton" />
          </div>
        </div>

        {/* Grid skeleton */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-xl overflow-hidden border border-border">
              <div className="aspect-video bg-surface-light skeleton" />
              <div className="p-4">
                <div className="h-5 w-3/4 bg-surface-light rounded skeleton mb-2" />
                <div className="h-4 w-1/2 bg-surface-light rounded skeleton" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
