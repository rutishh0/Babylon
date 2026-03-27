'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MediaResponse } from '@babylon/shared';
import { updateMedia, searchMetadata } from '@/lib/api';
import type { MetadataSearchResult } from '@/lib/api';

interface Props {
  media: MediaResponse;
  onClose: () => void;
}

export default function EditMetadataModal({ media, onClose }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: media.title,
    description: media.description ?? '',
    year: media.year ?? '',
    rating: media.rating ?? '',
    genres: media.genres.join(', '),
    posterUrl: media.posterUrl ?? '',
    backdropUrl: media.backdropUrl ?? '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MetadataSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchMetadata(searchQuery, media.type);
      setSearchResults(results);
    } catch {
      setError('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResult = (result: MetadataSearchResult) => {
    setForm((prev) => ({
      ...prev,
      title: result.title,
      description: result.overview ?? prev.description,
      year: result.year ?? prev.year,
      posterUrl: result.posterUrl ?? prev.posterUrl,
    }));
    setSearchResults([]);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await updateMedia(media.id, {
        title: form.title,
        description: form.description || undefined,
        year: form.year ? Number(form.year) : undefined,
        rating: form.rating ? Number(form.rating) : undefined,
        genres: form.genres
          ? form.genres.split(',').map((g) => g.trim()).filter(Boolean)
          : undefined,
        posterUrl: form.posterUrl || undefined,
        backdropUrl: form.backdropUrl || undefined,
      });
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-[#1a1a2e] rounded-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-xl font-semibold">Edit Metadata</h2>
          <button onClick={onClose} className="text-[#a0a0a0] hover:text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Metadata search */}
        <div className="mb-4">
          <label className="text-[#a0a0a0] text-sm mb-1 block">Search TMDB / Jikan</label>
          <div className="flex gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for metadata..."
              className="flex-1 bg-[#0a0a0a] border border-[#2a2a3e] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-accent"
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="bg-accent hover:bg-red-700 text-white text-sm px-4 py-2 rounded transition-colors disabled:opacity-50"
            >
              {searching ? '...' : 'Search'}
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 border border-[#2a2a3e] rounded bg-[#0a0a0a] max-h-40 overflow-y-auto">
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  className="w-full text-left px-3 py-2 hover:bg-[#1a1a2e] text-sm text-white border-b border-[#2a2a3e] last:border-0 flex items-center gap-3"
                  onClick={() => handleSelectResult(r)}
                >
                  <span className="text-[#a0a0a0] text-xs border border-[#2a2a3e] px-1 rounded">{r.source}</span>
                  <span>{r.title}</span>
                  {r.year && <span className="text-[#a0a0a0] text-xs">{r.year}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Form fields */}
        {[
          { key: 'title', label: 'Title' },
          { key: 'year', label: 'Year', type: 'number' },
          { key: 'rating', label: 'Rating (0-10)', type: 'number' },
          { key: 'genres', label: 'Genres (comma-separated)' },
          { key: 'posterUrl', label: 'Poster URL' },
          { key: 'backdropUrl', label: 'Backdrop URL' },
        ].map(({ key, label, type }) => (
          <div key={key} className="mb-3">
            <label className="text-[#a0a0a0] text-sm mb-1 block">{label}</label>
            <input
              type={type ?? 'text'}
              value={String(form[key as keyof typeof form])}
              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
              className="w-full bg-[#0a0a0a] border border-[#2a2a3e] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-accent"
            />
          </div>
        ))}

        <div className="mb-4">
          <label className="text-[#a0a0a0] text-sm mb-1 block">Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full bg-[#0a0a0a] border border-[#2a2a3e] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-accent resize-none"
          />
        </div>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="text-[#a0a0a0] hover:text-white text-sm px-4 py-2 rounded border border-[#2a2a3e] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-accent hover:bg-red-700 text-white text-sm px-4 py-2 rounded transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
