export function MediaCardSkeleton() {
  return (
    <div
      className="bg-card rounded-card animate-pulse"
      style={{ aspectRatio: '2/3' }}
    />
  );
}

export function HeroBannerSkeleton() {
  return (
    <div
      className="w-full bg-card animate-pulse"
      style={{ height: 'clamp(400px, 56vw, 700px)' }}
    />
  );
}

export function MediaRowSkeleton({ title }: { title?: string }) {
  return (
    <section className="mb-8">
      {title && <div className="h-6 w-40 bg-card rounded animate-pulse px-4 mb-3 mx-4" />}
      <div className="flex gap-3 overflow-hidden px-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="shrink-0 w-32 md:w-40">
            <MediaCardSkeleton />
          </div>
        ))}
      </div>
    </section>
  );
}

export function EpisodeListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3 rounded-card bg-card border border-[#2a2a3e] animate-pulse">
          <div className="shrink-0 rounded bg-[#0a0a0a]" style={{ width: 120, height: 68 }} />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 bg-[#2a2a3e] rounded w-3/4" />
            <div className="h-3 bg-[#2a2a3e] rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
