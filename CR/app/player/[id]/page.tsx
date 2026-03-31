"use client"

import { useState, useRef, useEffect, use } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Settings,
  ChevronLeft,
  List,
  ChevronRight,
  Subtitles,
  AlertTriangle,
} from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { animeList, episodesList } from "@/lib/mockData"
import { Badge } from "@/components/ui/badge"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function PlayerPage({ params }: PageProps) {
  const { id } = use(params)
  const anime = animeList.find(a => a.id === id) || animeList[0]
  const episodes = episodesList.filter(e => e.animeId === anime.id)
  const currentEpisode = episodes[0] || {
    number: 1,
    title: "Episode 1",
    duration: "23:40"
  }

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [progress, setProgress] = useState(15)
  const [volume, setVolume] = useState(80)
  const [showControls, setShowControls] = useState(true)
  const [showEpisodeList, setShowEpisodeList] = useState(false)
  const [showSkipIntro, setShowSkipIntro] = useState(true)

  const playerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true)
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false)
        }
      }, 3000)
    }

    const player = playerRef.current
    if (player) {
      player.addEventListener("mousemove", handleMouseMove)
      return () => player.removeEventListener("mousemove", handleMouseMove)
    }
  }, [isPlaying])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const totalSeconds = 23 * 60 + 40 // 23:40
  const currentSeconds = (progress / 100) * totalSeconds

  // Next episode data
  const nextEpisodeNumber = currentEpisode.number + 1
  const hasNextEpisode = nextEpisodeNumber <= anime.episodeCount

  return (
    <div className="min-h-screen bg-black">
      {/* Video Player */}
      <div
        ref={playerRef}
        className="relative w-full h-[calc(100vh-200px)] md:h-[calc(100vh-180px)] bg-black group"
        onClick={() => setIsPlaying(!isPlaying)}
      >
        {/* Video Placeholder */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${anime.coverImage})` }}
        >
          <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* Content Warning Badge */}
        <div className="absolute top-4 left-4 z-10">
          <Badge className="bg-black/80 text-white border-none flex items-center gap-1 px-2 py-1 rounded-sm">
            <AlertTriangle className="w-3 h-3" />
            <span className="text-xs">TV-14</span>
          </Badge>
        </div>

        {/* Skip Intro Button */}
        {showSkipIntro && progress > 5 && progress < 20 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setProgress(20)
              setShowSkipIntro(false)
            }}
            className="absolute bottom-24 right-6 z-10 px-6 py-2 bg-black/80 border border-white/30 text-white text-sm font-medium rounded hover:bg-black/90 transition-colors"
          >
            SKIP INTRO
          </button>
        )}

        {/* Play/Pause Overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              className="p-6 rounded-full bg-[#F47521]/90 hover:bg-[#F47521] transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setIsPlaying(true)
              }}
            >
              <Play className="w-12 h-12 text-white fill-white" />
            </button>
          </div>
        )}

        {/* Controls Overlay */}
        <div
          className={`absolute inset-0 transition-opacity ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <Link
                href={`/anime/${anime.id}`}
                className="p-2 hover:bg-white/10 rounded transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </Link>
              <button
                onClick={() => setShowEpisodeList(!showEpisodeList)}
                className="p-2 hover:bg-white/10 rounded transition-colors"
              >
                <List className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
            {/* Progress Bar */}
            <div className="mb-3 px-1">
              <div className="relative h-1 bg-white/30 rounded-full cursor-pointer group/progress">
                <div 
                  className="absolute h-full bg-[#F47521] rounded-full"
                  style={{ width: `${progress}%` }}
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(e) => setProgress(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {/* Thumb indicator */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[#F47521] rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"
                  style={{ left: `calc(${progress}% - 6px)` }}
                />
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {/* Play/Pause */}
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 hover:bg-white/10 rounded transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 text-white" />
                  ) : (
                    <Play className="w-6 h-6 text-white fill-white" />
                  )}
                </button>

                {/* Skip Back */}
                <button className="p-2 hover:bg-white/10 rounded transition-colors">
                  <SkipBack className="w-5 h-5 text-white" />
                </button>

                {/* Skip Forward */}
                <button className="p-2 hover:bg-white/10 rounded transition-colors">
                  <SkipForward className="w-5 h-5 text-white" />
                </button>

                {/* Volume */}
                <div className="flex items-center gap-2 ml-2">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2 hover:bg-white/10 rounded transition-colors"
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5 text-white" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-white" />
                    )}
                  </button>
                  <div className="w-20 hidden md:block">
                    <div className="relative h-1 bg-white/30 rounded-full cursor-pointer">
                      <div 
                        className="absolute h-full bg-white rounded-full"
                        style={{ width: `${isMuted ? 0 : volume}%` }}
                      />
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => {
                          setVolume(parseFloat(e.target.value))
                          setIsMuted(parseFloat(e.target.value) === 0)
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Time */}
                <span className="text-sm text-white ml-4">
                  {formatTime(currentSeconds)} / {currentEpisode.duration}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {/* Subtitles */}
                <button className="p-2 hover:bg-white/10 rounded transition-colors">
                  <Subtitles className="w-5 h-5 text-white" />
                </button>

                {/* Settings */}
                <button className="p-2 hover:bg-white/10 rounded transition-colors">
                  <Settings className="w-5 h-5 text-white" />
                </button>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-white/10 rounded transition-colors"
                >
                  {isFullscreen ? (
                    <Minimize className="w-5 h-5 text-white" />
                  ) : (
                    <Maximize className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Episode List Sidebar */}
        {showEpisodeList && (
          <div 
            className="absolute top-0 right-0 bottom-0 w-80 bg-[#141519]/98 backdrop-blur overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#23252b] flex items-center justify-between">
              <h3 className="text-white font-medium">Episodes</h3>
              <button 
                onClick={() => setShowEpisodeList(false)}
                className="p-1 hover:bg-[#23252b] rounded transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-2">
              {Array.from({ length: Math.min(anime.episodeCount, 24) }, (_, i) => (
                <button
                  key={i}
                  className={`w-full p-3 rounded text-left hover:bg-[#23252b] transition-colors ${
                    i === 0 ? "bg-[#23252b]" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-14 rounded bg-[#2a2c32] flex-shrink-0 overflow-hidden relative">
                      <Image
                        src={anime.thumbnail.replace("400", "640").replace("600", "360")}
                        alt={`Episode ${i + 1}`}
                        fill
                        className="object-cover"
                      />
                      {i === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <Play className="w-4 h-4 text-white fill-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">Episode {i + 1}</p>
                      <p className="text-xs text-[#a0a0a0]">23:40</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Episode Info Below Player */}
      <div className="bg-[#141519] px-4 md:px-8 lg:px-12 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Current Episode Info */}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white mb-1">{anime.title}</h1>
            <p className="text-[#a0a0a0] mb-3">
              E{currentEpisode.number} - {currentEpisode.title}
            </p>
            <div className="flex items-center gap-2 mb-4">
              {anime.subDub.includes("sub") && (
                <span className="text-xs px-2 py-0.5 bg-[#23252b] text-white rounded">Sub</span>
              )}
              {anime.subDub.includes("dub") && (
                <span className="text-xs px-2 py-0.5 bg-[#F47521] text-white rounded">Dub</span>
              )}
            </div>
            <p className="text-sm text-[#a0a0a0] leading-relaxed line-clamp-3">
              {anime.synopsis}
            </p>
          </div>

          {/* Next Episode Card */}
          {hasNextEpisode && (
            <div className="lg:w-80">
              <p className="text-xs text-[#a0a0a0] uppercase tracking-wider mb-2">NEXT EPISODE</p>
              <Link
                href={`/player/${anime.id}?ep=${nextEpisodeNumber}`}
                className="flex gap-3 p-3 bg-[#23252b] rounded hover:bg-[#2a2c32] transition-colors group"
              >
                <div className="relative w-28 aspect-video flex-shrink-0 rounded overflow-hidden">
                  <Image
                    src={anime.thumbnail.replace("400", "640").replace("600", "360")}
                    alt={`Episode ${nextEpisodeNumber}`}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white group-hover:text-[#F47521] transition-colors">
                    Episode {nextEpisodeNumber}
                  </p>
                  <p className="text-xs text-[#a0a0a0] mt-1">23:40</p>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
