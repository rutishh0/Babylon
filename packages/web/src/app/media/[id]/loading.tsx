import { EpisodeListSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-32 h-48 md:w-48 md:h-72 shrink-0 bg-card rounded-card animate-pulse" />
        <div className="flex-1 space-y-3 pt-0 md:pt-16">
          <div className="h-8 bg-card rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-card rounded w-1/2 animate-pulse" />
          <div className="h-16 bg-card rounded animate-pulse" />
        </div>
      </div>
      <div className="mt-10">
        <EpisodeListSkeleton />
      </div>
    </div>
  );
}
