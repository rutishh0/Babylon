import { create } from 'zustand';
import type { DownloadJob } from '@/lib/anime-api';
import { getDownloadStatus } from '@/lib/anime-api';

interface DownloadStore {
  queue: Record<string, DownloadJob>;
  initialized: boolean;
  initialize: () => Promise<void>;
  addJob: (jobId: string, job: DownloadJob) => void;
  updateJob: (jobId: string, updates: Partial<DownloadJob>) => void;
  pollJob: (jobId: string) => void;
  activeCount: () => number;
}

export const useDownloadStore = create<DownloadStore>((set, get) => ({
  queue: {},
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    try {
      const jobs = await getDownloadStatus();
      set({ queue: jobs, initialized: true });
      // Start polling active jobs
      for (const [id, job] of Object.entries(jobs)) {
        if (job.status !== 'complete') {
          get().pollJob(id);
        }
      }
    } catch {
      set({ initialized: true });
    }
  },

  addJob: (jobId, job) => {
    set((state) => ({ queue: { ...state.queue, [jobId]: job } }));
  },

  updateJob: (jobId, updates) => {
    set((state) => ({
      queue: {
        ...state.queue,
        [jobId]: { ...state.queue[jobId], ...updates },
      },
    }));
  },

  pollJob: (jobId) => {
    const poll = async () => {
      try {
        const data = await getDownloadStatus(jobId);
        const job = (data as Record<string, DownloadJob>)[jobId] || data;
        set((state) => ({ queue: { ...state.queue, [jobId]: job } }));
        if (job.status !== 'complete') {
          setTimeout(() => get().pollJob(jobId), 2000);
        }
      } catch { /* silent */ }
    };
    poll();
  },

  activeCount: () => {
    return Object.values(get().queue).filter((j) => j.status !== 'complete').length;
  },
}));
