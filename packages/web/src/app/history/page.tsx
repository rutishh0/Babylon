'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { History, Play, Trash2 } from 'lucide-react';

interface WatchHistoryEntry {
  animeId: string;
  animeTitle: string;
  episodeNumber: number;
  coverUrl: string | null;
  watchedAt: string;
  progress: number; // 0-100
}

const STORAGE_KEY = 'babylon-watch-history';

function getHistory(): WatchHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

function removeEntry(animeId: string, ep: number) {
  const history = getHistory().filter(
    h => !(h.animeId === animeId && h.episodeNumber === ep)
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return history;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<WatchHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleClear = () => {
    if (confirm('Clear all watch history?')) {
      clearHistory();
      setHistory([]);
    }
  };

  const handleRemove = (animeId: string, ep: number) => {
    setHistory(removeEntry(animeId, ep));
  };

  // Group by anime
  const grouped = new Map<string, WatchHistoryEntry[]>();
  for (const entry of history) {
    const key = entry.animeId;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(entry);
  }

  return (
    <div className="max-w-screen-lg mx-auto px-4 md:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-white text-3xl font-bold flex items-center gap-3">
          <History className="w-8 h-8 text-[#F47521]" />
          Watch History
        </h1>
        {history.length > 0 && (
          <button
            onClick={handleClear}
            className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-[#a0a0a0]">
          <History className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg mb-2">No watch history yet</p>
          <p className="text-sm mb-6">Episodes you watch will appear here</p>
          <Link
            href="/anime"
            className="bg-[#F47521] hover:bg-[#e06520] text-white px-6 py-2 rounded-sm font-medium transition-colors"
          >
            Browse Library
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([animeId, entries]) => (
            <div key={animeId} className="bg-[#141519] rounded-lg overflow-hidden">
              <div className="flex items-center gap-4 p-4 border-b border-[#23252b]">
                {entries[0].coverUrl && (
                  <img src={entries[0].coverUrl} alt="" className="w-12 h-16 object-cover rounded" />
                )}
                <div className="flex-1">
                  <Link
                    href={`/anime/${animeId}`}
                    className="text-white font-semibold hover:text-[#F47521] transition-colors"
                  >
                    {entries[0].animeTitle}
                  </Link>
                  <p className="text-[#a0a0a0] text-sm">{entries.length} episode{entries.length !== 1 ? 's' : ''} watched</p>
                </div>
              </div>
              <div className="divide-y divide-[#23252b]">
                {entries.map((entry) => (
                  <div key={`${entry.animeId}-${entry.episodeNumber}`} className="flex items-center gap-4 px-4 py-3 hover:bg-[#1a1a2e] transition-colors group">
                    <Link
                      href={`/watch/${entry.animeId}?ep=${entry.episodeNumber}`}
                      className="flex items-center gap-3 flex-1"
                    >
                      <Play className="w-4 h-4 text-[#a0a0a0] group-hover:text-[#F47521]" />
                      <span className="text-white text-sm">Episode {entry.episodeNumber}</span>
                      {entry.progress > 0 && entry.progress < 100 && (
                        <div className="w-20 h-1 bg-[#23252b] rounded-full overflow-hidden">
                          <div className="h-full bg-[#F47521] rounded-full" style={{ width: `${entry.progress}%` }} />
                        </div>
                      )}
                      {entry.progress >= 100 && (
                        <span className="text-green-400 text-xs">Completed</span>
                      )}
                    </Link>
                    <span className="text-[#a0a0a0] text-xs">
                      {new Date(entry.watchedAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleRemove(entry.animeId, entry.episodeNumber)}
                      className="text-[#a0a0a0] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
