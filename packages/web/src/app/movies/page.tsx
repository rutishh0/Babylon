import type { MediaResponse } from '@babylon/shared';
import { listMedia } from '@/lib/api';
import CategoryGrid from '@/components/CategoryGrid';

export const dynamic = 'force-dynamic';

export default async function MoviesPage() {
  let media: MediaResponse[] = [];
  try {
    media = await listMedia({ type: 'movie', sort: 'created_at', limit: 100 });
  } catch {
    // silently return empty list
  }
  return <CategoryGrid title="Movies" items={media} />;
}
