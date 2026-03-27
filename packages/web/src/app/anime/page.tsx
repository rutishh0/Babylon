import type { MediaResponse } from '@babylon/shared';
import { listMedia } from '@/lib/api';
import CategoryGrid from '@/components/CategoryGrid';

export const dynamic = 'force-dynamic';

export default async function AnimePage() {
  let media: MediaResponse[] = [];
  try {
    media = await listMedia({ type: 'anime', sort: 'created_at', limit: 100 });
  } catch {
    // silently return empty list
  }
  return <CategoryGrid title="Anime" items={media} />;
}
