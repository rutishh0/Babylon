import { HeroBannerSkeleton, MediaRowSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="pb-12">
      <HeroBannerSkeleton />
      <div className="mt-6">
        <MediaRowSkeleton title="Continue Watching" />
        <MediaRowSkeleton title="Recently Added" />
        <MediaRowSkeleton title="Loading..." />
      </div>
    </div>
  );
}
