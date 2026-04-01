"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Play, Bookmark, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface HeroAnime {
  id: string
  title: string
  cover_url: string | null
  description: string | null
  genres: string[]
  year: number | null
  episode_count: number | null
  status: string | null
  languages: string[]
  episode_count_downloaded?: number
}

interface HeroCarouselProps {
  anime: HeroAnime[]
  linkBuilder?: (anime: HeroAnime) => string
  ctaLabel?: string
}

export default function HeroCarousel({ anime, linkBuilder, ctaLabel }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  const itemCount = anime.length

  const goToNext = useCallback(() => {
    if (itemCount === 0) return
    setCurrentIndex((prev) => (prev + 1) % itemCount)
  }, [itemCount])

  const goToPrevious = useCallback(() => {
    if (itemCount === 0) return
    setCurrentIndex((prev) => (prev - 1 + itemCount) % itemCount)
  }, [itemCount])

  useEffect(() => {
    if (!isAutoPlaying || itemCount === 0) return
    const interval = setInterval(goToNext, 7000)
    return () => clearInterval(interval)
  }, [isAutoPlaying, goToNext, itemCount])

  if (itemCount === 0) {
    return (
      <div className="relative w-full h-[580px] md:h-[620px] lg:h-[660px] bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-[#a0a0a0] text-lg">No featured anime available</p>
      </div>
    )
  }

  const current = anime[currentIndex]

  return (
    <div
      className="relative w-full h-[580px] md:h-[620px] lg:h-[660px] overflow-hidden"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* Background base */}
      <div className="absolute inset-0 bg-black">
        {/* Radial gradient overlays for depth */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(244,117,33,0.08)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(0,0,0,0.9)_0%,_transparent_60%)]" />
      </div>

      {/* Cover Image - Right Side */}
      {current.cover_url && (
        <div className="absolute right-0 top-0 bottom-0 w-[55%] md:w-[60%] lg:w-[65%]">
          <img
            src={current.cover_url}
            alt={current.title}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          {/* Left fade for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-transparent" />
          {/* Bottom fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        </div>
      )}

      {/* Content - Left Side */}
      <div className="relative h-full flex flex-col justify-center px-6 md:px-12 lg:px-14 max-w-[550px]">
        {/* Title in large serif font */}
        <h1
          className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 tracking-tight"
          style={{
            fontFamily: "'Times New Roman', 'Georgia', serif",
            textShadow: "2px 2px 8px rgba(0,0,0,0.8)",
          }}
        >
          {current.title}
        </h1>

        {/* Genre Tags + Year + Status */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {current.year && (
            <>
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded border border-white/40 text-white text-xs font-medium">
                {current.year}
              </span>
              <span className="text-white/60 text-sm">&bull;</span>
            </>
          )}
          {current.status && (
            <>
              <span className="text-[#F47521] text-xs font-semibold uppercase">
                {current.status}
              </span>
              <span className="text-white/60 text-sm">&bull;</span>
            </>
          )}
          {current.episode_count != null && current.episode_count > 0 && (
            <>
              <span className="text-[#a0a0a0] text-sm">
                {current.episode_count} episode{current.episode_count !== 1 ? "s" : ""}
              </span>
              <span className="text-white/60 text-sm">&bull;</span>
            </>
          )}
          {(current.languages || []).length > 0 && (
            <span className="text-[#a0a0a0] text-sm">
              {(current.languages || []).map((l) => l === "sub" ? "Sub" : l === "dub" ? "Dub" : l).join(" | ")}
            </span>
          )}
        </div>

        {/* Genre Badges */}
        {(current.genres || []).length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {(current.genres || []).slice(0, 5).map((genre) => (
              <span
                key={genre}
                className="px-2.5 py-1 bg-white/10 text-white text-xs rounded-sm font-medium"
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {current.description && (
          <p className="text-[#a0a0a0] text-sm md:text-base leading-relaxed mb-6 line-clamp-4">
            {current.description}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link href={linkBuilder ? linkBuilder(current) : `/anime/${current.id}`}>
            <Button
              className="bg-[#F47521] hover:bg-[#e06515] text-white font-semibold px-5 py-2.5 h-auto rounded-sm flex items-center gap-2 text-sm cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              {ctaLabel || 'START WATCHING'}
            </Button>
          </Link>
          <Button
            variant="outline"
            className="border-white/40 bg-transparent text-white hover:bg-white/10 p-2.5 h-auto rounded-sm cursor-pointer"
          >
            <Bookmark className="w-5 h-5" />
          </Button>
        </div>

        {/* Carousel Progress Indicators - Dashed Lines */}
        <div className="flex items-center gap-2 mt-10">
          {anime.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-1 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "w-8 bg-white"
                  : "w-4 bg-white/30 hover:bg-white/50"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      {itemCount > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" strokeWidth={1.5} />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="w-8 h-8 md:w-10 md:h-10" strokeWidth={1.5} />
          </button>
        </>
      )}
    </div>
  )
}
