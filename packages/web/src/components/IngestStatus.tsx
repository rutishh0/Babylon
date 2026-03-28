'use client';

import { useState, useEffect, useCallback } from 'react';
import type { IngestStatus as IngestStatusType, WatchlistEntry } from '@babylon/shared';
import { getIngestStatus, getWatchlist, removeFromWatchlist, triggerIngest } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';

const STATE_COLORS: Record<string, string> = {
  searching: 'bg-blue-600',
  downloading: 'bg-yellow-500',
  transcoding: 'bg-orange-500',
  uploading: 'bg-purple-600',
  done: 'bg-green-600',
  failed: 'bg-red-600',
  pending: 'bg-[#2a2a3e]',
};

export default function IngestStatusPanel() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<IngestStatusType | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [triggering, setTriggering] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [removing, setRemoving] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const [s, w] = await Promise.all([getIngestStatus(), getWatchlist()]);
      setStatus(s);
      setWatchlist(w);
      setActiveCount(
        s.queue.filter((i) => i.state !== 'done' && i.state !== 'failed').length +
        w.length,
      );
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, open ? 10000 : 30000);
    return () => clearInterval(interval);
  }, [open, fetchData]);

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await triggerIngest();
      await fetchData();
    } catch {
      // silent
    } finally {
      setTriggering(false);
    }
  };

  const handleRemove = async (title: string) => {
    setRemoving((prev) => new Set(prev).add(title));
    try {
      await removeFromWatchlist(title);
      setWatchlist((prev) => prev.filter((e) => e.title !== title));
    } catch {
      // silent
    } finally {
      setRemoving((prev) => {
        const next = new Set(prev);
        next.delete(title);
        return next;
      });
    }
  };

  return (
    <>
      {/* Nav trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="relative p-1.5 text-[#a0a0a0] hover:text-white transition-colors"
        aria-label="Ingest Status"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M4.93 4.93a10 10 0 0 0 0 14.14" />
        </svg>
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-accent text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {activeCount > 9 ? '9+' : activeCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="fixed right-0 top-0 h-full w-96 bg-[#1a1a2e] border-l border-[#2a2a3e] z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#2a2a3e]">
              <h2 className="text-white font-semibold text-lg">Ingest Status</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-[#a0a0a0] hover:text-white transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
              {/* Daemon status */}
              {status && (
                <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#2a2a3e]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${status.running ? 'bg-green-500 animate-pulse' : 'bg-[#a0a0a0]'}`}
                      />
                      <span className="text-white text-sm font-medium">
                        {status.running ? 'Running' : 'Idle'}
                      </span>
                    </div>
                    <span className="text-[#a0a0a0] text-xs">
                      {status.lastPollAt ? formatRelativeTime(status.lastPollAt) : 'Never polled'}
                    </span>
                  </div>
                </div>
              )}

              {/* Force poll */}
              <button
                onClick={handleTrigger}
                disabled={triggering}
                className="w-full text-sm font-medium bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {triggering ? 'Triggering...' : 'Force Poll Now'}
              </button>

              {/* Current task */}
              {status?.currentTask && (
                <div>
                  <h3 className="text-[#a0a0a0] text-xs uppercase tracking-wider mb-3 font-semibold">
                    Current Task
                  </h3>
                  <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#2a2a3e]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white text-sm font-medium line-clamp-1">
                        {status.currentTask.title}
                      </span>
                      <span
                        className={`text-white text-xs px-2 py-0.5 rounded-full ${
                          STATE_COLORS[status.currentTask.state] ?? 'bg-[#2a2a3e]'
                        }`}
                      >
                        {status.currentTask.state}
                      </span>
                    </div>
                    <div className="h-2 bg-[#2a2a3e] rounded-full">
                      <div
                        className="h-full bg-accent rounded-full transition-all"
                        style={{ width: `${status.currentTask.progress}%` }}
                      />
                    </div>
                    <p className="text-[#a0a0a0] text-xs mt-2">{status.currentTask.progress}% complete</p>
                  </div>
                </div>
              )}

              {/* Active Queue */}
              {status && status.queue.length > 0 && (
                <div>
                  <h3 className="text-[#a0a0a0] text-xs uppercase tracking-wider mb-3 font-semibold">
                    Processing Queue ({status.queue.length})
                  </h3>
                  <div className="space-y-2">
                    {status.queue.map((item, i) => (
                      <div key={i} className="bg-[#0a0a0a] rounded-lg p-3 border border-[#2a2a3e]">
                        <div className="flex items-center justify-between">
                          <span className="text-white text-xs font-medium line-clamp-1">
                            {item.title}
                          </span>
                          <span
                            className={`text-white text-[10px] px-2 py-0.5 rounded-full ml-2 shrink-0 ${
                              STATE_COLORS[item.state] ?? 'bg-[#2a2a3e]'
                            }`}
                          >
                            {item.state}
                          </span>
                        </div>
                        {item.state === 'downloading' && item.progress > 0 && (
                          <div className="h-1.5 bg-[#2a2a3e] rounded-full mt-2">
                            <div
                              className="h-full bg-yellow-500 rounded-full"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Watchlist */}
              <div>
                <h3 className="text-[#a0a0a0] text-xs uppercase tracking-wider mb-3 font-semibold">
                  Watchlist ({watchlist.length})
                </h3>
                {watchlist.length === 0 ? (
                  <div className="bg-[#0a0a0a] rounded-lg p-6 border border-[#2a2a3e] text-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 text-[#a0a0a0] opacity-40">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <p className="text-[#a0a0a0] text-sm">No items in watchlist</p>
                    <p className="text-[#a0a0a0] text-xs mt-1">Use Discover to add anime</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {watchlist.map((entry) => (
                      <div
                        key={entry.title}
                        className="bg-[#0a0a0a] rounded-lg p-3 border border-[#2a2a3e] group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium line-clamp-1">
                              {entry.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[#a0a0a0] text-xs capitalize">
                                {entry.mode}
                              </span>
                              {entry.season && (
                                <span className="text-[#a0a0a0] text-xs">
                                  S{entry.season}
                                </span>
                              )}
                              <span className="text-[#a0a0a0] text-xs">
                                {formatRelativeTime(entry.addedAt)}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemove(entry.title)}
                            disabled={removing.has(entry.title)}
                            className="text-[#a0a0a0] hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100 shrink-0"
                            title="Remove from watchlist"
                          >
                            {removing.has(entry.title) ? (
                              <div className="w-4 h-4 border border-[#a0a0a0] border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
