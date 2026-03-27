import { getMedia } from '@/lib/api';
import MediaDetail from '@/components/MediaDetail';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MediaPage({ params }: Props) {
  const { id } = await params;
  let media;
  try {
    media = await getMedia(id);
  } catch {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[#a0a0a0]">
        <p>Media not found.</p>
      </div>
    );
  }

  return <MediaDetail media={media} />;
}
