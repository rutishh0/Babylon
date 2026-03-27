import { MediaCardSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      <div className="h-12 bg-card rounded-full animate-pulse mb-6" />
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <MediaCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
