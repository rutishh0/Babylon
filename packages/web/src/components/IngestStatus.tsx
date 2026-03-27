'use client';

import { useState, useEffect } from 'react';
import type { IngestStatus as IngestStatusType } from '@babylon/shared';
import { getIngestStatus, triggerIngest } from '@/lib/api';
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
  const [triggering, setTriggering] = useState(false);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      try {
        const s = await getIngestStatus();
        if (!cancelled) {
          setStatus(s);
          setActiveCount(
            s.queue.filter((i) => i.state !== 'done' && i.state !== 'failed').length,
          );
        }
      } catch {
        // silent
      }
    }

    fetch();
    const interval = setInterval(fetch, open ? 10000 : 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open]);

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await triggerIngest();
    } catch {
      // silent
    } finally {
      setTriggering(false);
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
          <div className="fixed right-0 top-0 h-full w-80 bg-[#1a1a2e] border-l border-[#2a2a3e] z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#2a2a3e]">
              <h2 className="text-white font-semibold">Ingest Status</h2>
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
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Daemon status */}
              {status && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${status.running ? 'bg-green-500' : 'bg-[#a0a0a0]'}`}
                    />
                    <span className="text-white text-sm">
                      {status.running ? 'Running' : 'Idle'}
                    </span>
                  </div>
                  <span className="text-[#a0a0a0] text-xs">
                    {formatRelativeTime(status.lastPollAt)}
                  </span>
                </div>
              )}

              {/* Force poll */}
              <button
                onClick={handleTrigger}
                disabled={triggering}
                className="w-full text-sm bg-[#0a0a0a] border border-[#2a2a3e] text-[#a0a0a0] hover:text-white py-2 rounded transition-colors disabled:opacity-50"
              >
                {triggering ? 'Triggering...' : 'Force Poll'}
              </button>

              {/* Current task */}
              {status?.currentTask && (
                <div className="bg-[#0a0a0a] rounded-card p-3 border border-[#2a2a3e]">
                  <div className="flex items-center justify-between mb-2">
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
                  <div className="h-1.5 bg-[#2a2a3e] rounded">
                    <div
                      className="h-full bg-accent rounded transition-all"
                      style={{ width: `${status.currentTask.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Queue */}
              <div>
                <h3 className="text-[#a0a0a0] text-xs uppercase tracking-wider mb-3">Queue</h3>
                {!status || status.queue.length === 0 ? (
                  <p className="text-[#a0a0a0] text-sm text-center py-4">Queue is empty</p>
                ) : (
                  <div className="space-y-2">
                    {status.queue.map((item, i) => (
                      <div key={i} className="bg-[#0a0a0a] rounded p-2.5 border border-[#2a2a3e]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white text-xs font-medium line-clamp-1">
                            {item.title}
                          </span>
                          <span
                            className={`text-white text-xs px-1.5 py-0.5 rounded-full ml-2 shrink-0 ${
                              STATE_COLORS[item.state] ?? 'bg-[#2a2a3e]'
                            }`}
                          >
                            {item.state}
                          </span>
                        </div>
                        {item.state === 'downloading' && item.progress > 0 && (
                          <div className="h-1 bg-[#2a2a3e] rounded">
                            <div
                              className="h-full bg-yellow-500 rounded"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        )}
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
