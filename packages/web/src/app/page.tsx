import { getHomeScreen } from '@/lib/api';
import HeroBanner from '@/components/HeroBanner';
import MediaRow from '@/components/MediaRow';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let data;
  try {
    data = await getHomeScreen();
  } catch {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[#a0a0a0]">
        <p>Unable to load content. Make sure the API is running.</p>
      </div>
    );
  }

  const heroMedia =
    data.continueWatching[0] ?? data.recentlyAdded[0] ?? null;

  return (
    <div className="pb-12">
      {heroMedia && <HeroBanner media={heroMedia} />}

      <div className="mt-6">
        {data.continueWatching.length > 0 && (
          <MediaRow
            title="Continue Watching"
            items={data.continueWatching}
            showProgress
          />
        )}

        {data.recentlyAdded.length > 0 && (
          <MediaRow title="Recently Added" items={data.recentlyAdded} />
        )}

        {data.genreRows.map(({ genre, media }) => (
          <MediaRow key={genre} title={genre} items={media} />
        ))}
      </div>
    </div>
  );
}
