'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { MediaResponse } from '@babylon/shared';
import { updateProgress } from '@/lib/api';

interface SubtitleTrack {
  url: string;
  language: string;
  label: string;
}

interface Props {
  streamUrl: string;
  media: MediaResponse;
  episodeId?: string;
  subtitles: SubtitleTrack[];
  initialPosition?: number;
}

export default function Player({ streamUrl, media, episodeId, subtitles, initialPosition }: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeSubtitle, setActiveSubtitle] = useState('off');
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [showSkipIntro, setShowSkipIntro] = useState(false);

  // Episode label
  let episodeLabel = '';
  if (media.seasons && episodeId) {
    for (const season of media.seasons) {
      for (const ep of season.episodes) {
        if (ep.id === episodeId) {
          episodeLabel = ` — S${season.seasonNumber} E${ep.episodeNumber}`;
          break;
        }
      }
    }
  }

  // Controls visibility
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setControlsVisible(false);
      }
    }, 3000);
  }, []);

  useEffect(() => {
    showControls();
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, [showControls]);

  // Set initial position
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onLoaded = () => {
      if (initialPosition && initialPosition > 30) {
        video.currentTime = initialPosition;
      }
    };
    video.addEventListener('loadedmetadata', onLoaded);
    return () => video.removeEventListener('loadedmetadata', onLoaded);
  }, [initialPosition]);

  // Progress saving
  const saveProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    updateProgress(media.id, {
      episodeId,
      positionSeconds: video.currentTime,
      durationSeconds: video.duration,
    }).catch(() => {/* silent */});
  }, [media.id, episodeId]);

  useEffect(() => {
    const interval = setInterval(saveProgress, 10000);
    const video = videoRef.current;

    const onPause = () => saveProgress();
    video?.addEventListener('pause', onPause);

    const onBeforeUnload = () => saveProgress();
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      clearInterval(interval);
      video?.removeEventListener('pause', onPause);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [saveProgress]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          video.paused ? video.play() : video.pause();
          break;
        case 'ArrowLeft':
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case 'ArrowRight':
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          break;
        case 'ArrowUp':
          video.volume = Math.min(1, video.volume + 0.1);
          setVolume(video.volume);
          break;
        case 'ArrowDown':
          video.volume = Math.max(0, video.volume - 0.1);
          setVolume(video.volume);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'm':
          video.muted = !video.muted;
          setMuted(video.muted);
          break;
        case 'Escape':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            router.back();
          }
          break;
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [router]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.paused ? video.play() : video.pause();
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const handleSubtitleChange = (lang: string) => {
    const video = videoRef.current;
    if (!video) return;
    setActiveSubtitle(lang);
    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = video.textTracks[i].language === lang ? 'showing' : 'hidden';
    }
    setShowSubMenu(false);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50"
      onMouseMove={showControls}
      onTouchStart={showControls}
      style={{ cursor: controlsVisible ? 'default' : 'none' }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={streamUrl}
        className="w-full h-full object-contain"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (!v) return;
          setCurrentTime(v.currentTime);
          setShowSkipIntro(v.currentTime >= 60 && v.currentTime <= 210);
          if (v.buffered.length > 0) {
            setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
          }
        }}
        onLoadedMetadata={() => {
          const v = videoRef.current;
          if (v) setDuration(v.duration);
        }}
        onVolumeChange={() => {
          const v = videoRef.current;
          if (v) {
            setVolume(v.volume);
            setMuted(v.muted);
          }
        }}
        crossOrigin="anonymous"
      >
        {subtitles.map((sub) => (
          <track
            key={sub.language}
            kind="subtitles"
            src={sub.url}
            srcLang={sub.language}
            label={sub.label}
          />
        ))}
      </video>

      {/* Skip Intro */}
      {showSkipIntro && (
        <button
          className="absolute bottom-24 right-8 bg-black/70 border border-white/30 text-white text-sm font-medium px-5 py-2 rounded hover:bg-white/10 transition-colors"
          onClick={() => {
            if (videoRef.current) videoRef.current.currentTime = 210;
          }}
        >
          Skip Intro
        </button>
      )}

      {/* Controls overlay */}
      <div
        className="absolute inset-0 flex flex-col justify-between transition-opacity duration-300"
        style={{ opacity: controlsVisible ? 1 : 0 }}
      >
        {/* Top bar */}
        <div className="bg-gradient-to-b from-black/60 to-transparent px-4 pt-4 pb-8 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-white hover:text-[#a0a0a0] transition-colors"
            aria-label="Go back"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <span className="text-white font-medium">
            {media.title}{episodeLabel}
          </span>
        </div>

        {/* Bottom bar */}
        <div className="bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-12">
          {/* Progress */}
          <div className="relative mb-2">
            {/* Buffered */}
            <div
              className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-white/20 rounded pointer-events-none"
              style={{ width: `${buffered}%` }}
            />
            <input
              type="range"
              min={0}
              max={100}
              step={0.01}
              value={progressPct}
              onChange={(e) => {
                const v = videoRef.current;
                if (v) v.currentTime = (parseFloat(e.target.value) / 100) * v.duration;
              }}
              className="w-full h-1 relative z-10"
              style={{ ['--progress' as string]: `${progressPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Play/Pause */}
              <button onClick={togglePlay} className="text-white hover:text-[#a0a0a0] transition-colors">
                {playing ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
              </button>

              {/* Skip back */}
              <button
                onClick={() => videoRef.current && (videoRef.current.currentTime -= 10)}
                className="text-white hover:text-[#a0a0a0] transition-colors text-xs"
                title="Skip back 10s"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 .49-3.25" />
                </svg>
              </button>

              {/* Skip forward */}
              <button
                onClick={() => videoRef.current && (videoRef.current.currentTime += 10)}
                className="text-white hover:text-[#a0a0a0] transition-colors"
                title="Skip forward 10s"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-.49-3.25" />
                </svg>
              </button>

              {/* Volume (hidden on mobile) */}
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => {
                    const v = videoRef.current;
                    if (!v) return;
                    v.muted = !v.muted;
                    setMuted(v.muted);
                  }}
                  className="text-white hover:text-[#a0a0a0] transition-colors"
                >
                  {muted || volume === 0 ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={muted ? 0 : Math.round(volume * 100)}
                  onChange={(e) => {
                    const v = videoRef.current;
                    if (!v) return;
                    const val = parseInt(e.target.value) / 100;
                    v.volume = val;
                    v.muted = val === 0;
                    setVolume(val);
                  }}
                  className="w-20"
                  style={{ ['--progress' as string]: `${muted ? 0 : volume * 100}%` }}
                />
              </div>

              {/* Time */}
              <span className="text-white text-xs tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Speed */}
              <select
                value={speed}
                onChange={(e) => {
                  const v = videoRef.current;
                  const s = parseFloat(e.target.value);
                  if (v) v.playbackRate = s;
                  setSpeed(s);
                }}
                className="bg-transparent text-white text-xs border border-white/20 rounded px-1 py-0.5"
              >
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                  <option key={s} value={s} className="bg-black">
                    {s}x
                  </option>
                ))}
              </select>

              {/* CC button */}
              {subtitles.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowSubMenu(!showSubMenu)}
                    className={`text-xs font-bold px-2 py-0.5 rounded border transition-colors ${
                      activeSubtitle !== 'off'
                        ? 'text-accent border-accent'
                        : 'text-white border-white/20 hover:border-white'
                    }`}
                  >
                    CC
                  </button>
                  {showSubMenu && (
                    <div className="absolute bottom-8 right-0 bg-black/90 border border-white/20 rounded min-w-32">
                      <button
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 border-b border-white/10"
                        onClick={() => handleSubtitleChange('off')}
                      >
                        Off
                      </button>
                      {subtitles.map((s) => (
                        <button
                          key={s.language}
                          className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10"
                          onClick={() => handleSubtitleChange(s.language)}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-[#a0a0a0] transition-colors"
              >
                {fullscreen ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
