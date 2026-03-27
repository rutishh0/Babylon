import { getMedia } from '@/lib/api';
import PlayerPage from '@/components/PlayerPage';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ episode?: string }>;
}

export default async function WatchPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { episode } = await searchParams;

  let media;
  try {
    media = await getMedia(id);
  } catch {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
        <p>Media not found.</p>
      </div>
    );
  }

  return <PlayerPage media={media} episodeId={episode} />;
}
