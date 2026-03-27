'use client';

import { useEffect, useState } from 'react';
import { getIngestStatus } from '@/lib/api';

export default function IngestStatusBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchCount() {
      try {
        const status = await getIngestStatus();
        if (!cancelled) {
          const active = status.queue.filter(
            (item) => item.state !== 'done' && item.state !== 'failed',
          ).length;
          setCount(active);
        }
      } catch {
        // silently ignore
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (count === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 bg-accent text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
      {count > 9 ? '9+' : count}
    </span>
  );
}
