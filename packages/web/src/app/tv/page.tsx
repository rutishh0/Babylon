import type { MediaResponse } from '@babylon/shared';
import { listMedia } from '@/lib/api';
import CategoryGrid from '@/components/CategoryGrid';

export const dynamic = 'force-dynamic';

export default async function TvPage() {
  let media: MediaResponse[] = [];
  try {
    media = await listMedia({ type: 'series', sort: 'created_at', limit: 100 });
  } catch {
    // silently return empty list
  }
  return <CategoryGrid title="TV Shows" items={media} />;
}
