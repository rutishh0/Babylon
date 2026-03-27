'use client';

import { useState, useRef, useCallback } from 'react';
import type { MediaType } from '@babylon/shared';
import {
  searchMetadata,
  createMedia,
  initiateUpload,
  completeUpload,
} from '@/lib/api';
import type { MetadataSearchResult } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { formatFileSize } from '@/lib/utils';

type UploadStatus = 'waiting' | 'uploading' | 'complete' | 'failed';

interface FileEntry {
  file: File;
  id: string;
  status: UploadStatus;
  progress: number;
  error?: string;
  season?: number;
  episode?: number;
  mediaId?: string;
  mediaTitle?: string;
  mediaType: MediaType;
  searchQuery: string;
  searchResults: MetadataSearchResult[];
  searchOpen: boolean;
}

function parseFilename(name: string) {
  let season: number | undefined;
  let episode: number | undefined;
  let year: number | undefined;

  const seMatch = name.match(/S(\d+)E(\d+)/i);
  if (seMatch) {
    season = parseInt(seMatch[1]);
    episode = parseInt(seMatch[2]);
  }

  const epMatch = name.match(/[-\s]\[?(\d{2,3})\]?/);
  if (!episode && epMatch) {
    episode = parseInt(epMatch[1]);
  }

  const yearMatch = name.match(/(19|20)\d{2}/);
  if (yearMatch) year = parseInt(yearMatch[0]);

  // Clean title
  const title = name
    .replace(/\.[^.]+$/, '') // remove extension
    .replace(/[-_\[\]()]/g, ' ')
    .replace(/S\d+E\d+/i, '')
    .replace(/(19|20)\d{2}/, '')
    .replace(/\d{3,4}p/i, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return { season, episode, year, title };
}

export default function UploadPage() {
  const { toast } = useToast();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: File[]) => {
    const entries: FileEntry[] = newFiles.map((file) => {
      const { season, episode, title } = parseFilename(file.name);
      return {
        file,
        id: `${Date.now()}-${Math.random()}`,
        status: 'waiting',
        progress: 0,
        season,
        episode,
        mediaType: 'anime',
        searchQuery: title,
        searchResults: [],
        searchOpen: false,
      };
    });
    setFiles((prev) => [...prev, ...entries]);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('video/'),
    );
    addFiles(dropped);
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    addFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const update = (id: string, patch: Partial<FileEntry>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    );
  };

  const handleSearch = async (entry: FileEntry) => {
    if (!entry.searchQuery.trim()) return;
    try {
      const results = await searchMetadata(entry.searchQuery, entry.mediaType);
      update(entry.id, { searchResults: results, searchOpen: true });
    } catch {
      toast('Search failed', 'error');
    }
  };

  const handleSelectResult = async (entry: FileEntry, result: MetadataSearchResult) => {
    try {
      const media = await createMedia({
        title: result.title,
        type: entry.mediaType,
        description: result.overview ?? undefined,
        posterUrl: result.posterUrl ?? undefined,
        year: result.year ?? undefined,
        source: result.source,
      });
      update(entry.id, {
        mediaId: media.id,
        mediaTitle: media.title,
        searchResults: [],
        searchOpen: false,
      });
      toast(`Created "${media.title}"`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create media', 'error');
    }
  };

  const handleUpload = async (entry: FileEntry) => {
    if (!entry.mediaId) {
      toast('Please select a media entry first', 'error');
      return;
    }

    update(entry.id, { status: 'uploading', progress: 0 });

    try {
      const { uploadUrl, s3Key } = await initiateUpload({
        filename: entry.file.name,
        contentType: entry.file.type || 'video/mp4',
        mediaId: entry.mediaId,
        type: entry.mediaType,
        seasonNumber: entry.season,
        episodeNumber: entry.episode,
      });

      // XHR for progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', entry.file.type || 'video/mp4');

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            update(entry.id, { progress: pct });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        };

        xhr.onerror = () => reject(new Error('Upload network error'));
        xhr.send(entry.file);
      });

      await completeUpload({
        s3Key,
        mediaId: entry.mediaId,
        fileSize: entry.file.size,
        originalFilename: entry.file.name,
        episodeId: undefined,
      });

      update(entry.id, { status: 'complete', progress: 100 });
      toast(`Uploaded "${entry.file.name}"`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      update(entry.id, { status: 'failed', error: msg });
      toast(msg, 'error');
    }
  };

  const statusBadge = (status: UploadStatus, progress: number) => {
    switch (status) {
      case 'waiting':
        return <span className="text-[#a0a0a0] text-xs">Waiting</span>;
      case 'uploading':
        return (
          <span className="text-yellow-400 text-xs font-semibold">{progress}%</span>
        );
      case 'complete':
        return <span className="text-green-400 text-xs font-semibold">✓ Complete</span>;
      case 'failed':
        return <span className="text-red-400 text-xs font-semibold">Failed</span>;
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      <h1 className="text-white text-2xl font-bold mb-6">Upload Content</h1>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-card p-12 text-center cursor-pointer transition-colors mb-8 ${
          dragging
            ? 'border-accent bg-accent/10'
            : 'border-[#2a2a3e] hover:border-[#4a4a5e]'
        }`}
      >
        <svg
          className="mx-auto mb-4 text-[#a0a0a0]"
          width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
        >
          <polyline points="16 16 12 12 8 16" />
          <line x1="12" y1="12" x2="12" y2="21" />
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
        </svg>
        <p className="text-white font-medium mb-1">Drag files here or click to browse</p>
        <p className="text-[#a0a0a0] text-sm">Supports video files (MP4, MKV, etc.)</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={onFileSelect}
      />

      {/* File list */}
      <div className="space-y-4">
        {files.map((entry) => (
          <div key={entry.id} className="bg-card rounded-card border border-[#2a2a3e] p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{entry.file.name}</p>
                <p className="text-[#a0a0a0] text-xs">{formatFileSize(entry.file.size)}</p>
              </div>
              {statusBadge(entry.status, entry.progress)}
            </div>

            {/* Progress bar */}
            {entry.status === 'uploading' && (
              <div className="h-1 bg-[#0a0a0a] rounded mb-3">
                <div
                  className="h-full bg-accent rounded transition-all"
                  style={{ width: `${entry.progress}%` }}
                />
              </div>
            )}

            {entry.status !== 'complete' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Media type */}
                <div>
                  <label className="text-[#a0a0a0] text-xs mb-1 block">Type</label>
                  <select
                    value={entry.mediaType}
                    onChange={(e) => update(entry.id, { mediaType: e.target.value as MediaType })}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a3e] text-white text-sm rounded px-2 py-1.5"
                  >
                    <option value="anime">Anime</option>
                    <option value="movie">Movie</option>
                    <option value="series">TV Series</option>
                  </select>
                </div>

                {/* Search */}
                <div>
                  <label className="text-[#a0a0a0] text-xs mb-1 block">Search / Match</label>
                  <div className="flex gap-2">
                    <input
                      value={entry.searchQuery}
                      onChange={(e) => update(entry.id, { searchQuery: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch(entry)}
                      placeholder="Search metadata..."
                      className="flex-1 bg-[#0a0a0a] border border-[#2a2a3e] text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-accent"
                    />
                    <button
                      onClick={() => handleSearch(entry)}
                      className="bg-accent hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded transition-colors"
                    >
                      Find
                    </button>
                  </div>

                  {/* Search results */}
                  {entry.searchOpen && entry.searchResults.length > 0 && (
                    <div className="mt-1 border border-[#2a2a3e] rounded bg-[#0a0a0a] max-h-40 overflow-y-auto">
                      {entry.searchResults.map((r) => (
                        <button
                          key={r.id}
                          className="w-full text-left px-2 py-1.5 hover:bg-[#1a1a2e] text-xs text-white border-b border-[#2a2a3e] last:border-0 flex items-center gap-2"
                          onClick={() => handleSelectResult(entry, r)}
                        >
                          <span className="text-[#a0a0a0] border border-[#2a2a3e] px-1 rounded">{r.source}</span>
                          <span>{r.title}</span>
                          {r.year && <span className="text-[#a0a0a0]">{r.year}</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {entry.mediaTitle && (
                    <p className="text-green-400 text-xs mt-1">✓ {entry.mediaTitle}</p>
                  )}
                </div>

                {/* Season / Episode */}
                {(entry.mediaType === 'anime' || entry.mediaType === 'series') && (
                  <>
                    <div>
                      <label className="text-[#a0a0a0] text-xs mb-1 block">Season</label>
                      <input
                        type="number"
                        value={entry.season ?? ''}
                        onChange={(e) => update(entry.id, { season: parseInt(e.target.value) || undefined })}
                        className="w-full bg-[#0a0a0a] border border-[#2a2a3e] text-white text-sm rounded px-2 py-1.5"
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="text-[#a0a0a0] text-xs mb-1 block">Episode</label>
                      <input
                        type="number"
                        value={entry.episode ?? ''}
                        onChange={(e) => update(entry.id, { episode: parseInt(e.target.value) || undefined })}
                        className="w-full bg-[#0a0a0a] border border-[#2a2a3e] text-white text-sm rounded px-2 py-1.5"
                        min={1}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Upload / Retry */}
            {entry.status === 'waiting' && (
              <button
                onClick={() => handleUpload(entry)}
                disabled={!entry.mediaId}
                className="mt-3 bg-accent hover:bg-red-700 text-white text-sm font-semibold px-5 py-2 rounded-full transition-colors disabled:opacity-50"
              >
                Upload
              </button>
            )}
            {entry.status === 'failed' && (
              <button
                onClick={() => {
                  update(entry.id, { status: 'waiting', progress: 0, error: undefined });
                  handleUpload(entry);
                }}
                className="mt-3 bg-accent hover:bg-red-700 text-white text-sm font-semibold px-5 py-2 rounded-full transition-colors"
              >
                Retry
              </button>
            )}
            {entry.error && (
              <p className="text-red-400 text-xs mt-1">{entry.error}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
