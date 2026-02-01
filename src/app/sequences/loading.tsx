import { SequenceGridSkeleton } from '@/components/SequenceCardSkeleton';

export default function SequencesLoading() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="text-center mb-12">
          <div className="h-12 w-64 bg-surface-light rounded skeleton mx-auto mb-4" />
          <div className="h-6 w-96 bg-surface-light rounded skeleton mx-auto" />
        </div>

        {/* Tabs skeleton */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-surface rounded-xl border border-border p-1 gap-2">
            <div className="h-12 w-40 bg-surface-light rounded-lg skeleton" />
            <div className="h-12 w-40 bg-surface-light rounded-lg skeleton" />
          </div>
        </div>

        {/* Grid skeleton */}
        <SequenceGridSkeleton count={8} />
      </div>
    </div>
  );
}
