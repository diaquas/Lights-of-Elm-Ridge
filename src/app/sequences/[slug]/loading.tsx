export default function SequenceDetailLoading() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb skeleton */}
        <div className="mb-8 flex gap-2">
          <div className="h-4 w-16 bg-surface-light rounded skeleton" />
          <span className="text-foreground/40">/</span>
          <div className="h-4 w-24 bg-surface-light rounded skeleton" />
          <span className="text-foreground/40">/</span>
          <div className="h-4 w-32 bg-surface-light rounded skeleton" />
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Main content */}
          <div className="lg:col-span-3">
            {/* Title */}
            <div className="h-10 w-3/4 bg-surface-light rounded skeleton mb-2" />
            <div className="h-6 w-1/2 bg-surface-light rounded skeleton mb-6" />

            {/* Video skeleton */}
            <div className="aspect-video bg-surface-light rounded-xl skeleton mb-6" />

            {/* Description */}
            <div className="space-y-3">
              <div className="h-4 w-full bg-surface-light rounded skeleton" />
              <div className="h-4 w-5/6 bg-surface-light rounded skeleton" />
              <div className="h-4 w-4/6 bg-surface-light rounded skeleton" />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2">
            <div className="bg-surface rounded-xl border border-border p-6">
              {/* Price */}
              <div className="h-8 w-20 bg-surface-light rounded skeleton mb-4" />

              {/* CTA button */}
              <div className="h-12 w-full bg-surface-light rounded-xl skeleton mb-6" />

              {/* Details */}
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 w-20 bg-surface-light rounded skeleton" />
                    <div className="h-4 w-24 bg-surface-light rounded skeleton" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
