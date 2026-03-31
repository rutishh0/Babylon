"use client"

import { useState, useEffect, useCallback } from "react"
import { Play, Bookmark, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Anime } from "@/lib/mockData"

interface HeroCarouselProps {
  anime: Anime[]
}

// Featured anime data matching the Crunchyroll style
const featuredShows = [
  {
    id: "jjk",
    title: "JUJUTSU KAISEN",
    subtitle: "THE CULLING GAME  Part 1",
    rating: "16+",
    tags: ["Sub", "Dub", "Supernatural", "Action", "Drama", "Fantasy", "Shounen"],
    description: "JUJUTSU KAISEN is a serialized manga series with story and artwork by Gege Akutami and published in Weekly Shonen Jump. An anime adaptation came shortly after, with animation handled by Studio MAPPA. Currently there are multiple seasons with Season 1 (24...",
    characterImage: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202026-03-30%20225139-uswMje9k5KDLMy90Br0GmRUMV2fPQA.png",
    bgGradient: "from-[#4a1a1a] via-[#2d1515] to-[#1a0a0a]"
  },
  {
    id: "solo",
    title: "SOLO LEVELING",
    subtitle: "Arise from the Shadow",
    rating: "16+",
    tags: ["Sub", "Dub", "Action", "Adventure", "Fantasy"],
    description: "In a world where hunters — humans who possess magical abilities — must battle deadly monsters to protect the human race from certain annihilation, a notoriously weak hunter named Sung Jinwoo finds himself in a seemingly endless struggle for survival.",
    characterImage: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&h=900&fit=crop",
    bgGradient: "from-[#1a1a4a] via-[#15152d] to-[#0a0a1a]"
  },
  {
    id: "demon",
    title: "DEMON SLAYER",
    subtitle: "Hashira Training Arc",
    rating: "14+",
    tags: ["Sub", "Dub", "Action", "Supernatural", "Shonen"],
    description: "Tanjiro Kamado, joined with Inosuke Hashibira, a boy raised by boars who wears a boar's head, and Zenitsu Agatsuma, a scared boy who reveals his true power when he sleeps, boards the Infinity Train on a new mission.",
    characterImage: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&h=900&fit=crop",
    bgGradient: "from-[#2d1a4a] via-[#1a1530] to-[#0a0a15]"
  },
  {
    id: "one",
    title: "ONE PIECE",
    subtitle: "Egghead Arc",
    rating: "14+",
    tags: ["Sub", "Dub", "Action", "Adventure", "Comedy"],
    description: "Monkey D. Luffy sets off on an adventure with his pirate crew in hopes of finding the greatest treasure ever, known as the 'One Piece'. The Straw Hat Pirates embark on their most dangerous journey yet.",
    characterImage: "https://images.unsplash.com/photo-1607457561901-e6ec3a6d16cf?w=800&h=900&fit=crop",
    bgGradient: "from-[#4a3a1a] via-[#2d2515] to-[#1a150a]"
  },
  {
    id: "frieren",
    title: "FRIEREN",
    subtitle: "Beyond Journey's End",
    rating: "12+",
    tags: ["Sub", "Dub", "Adventure", "Drama", "Fantasy"],
    description: "The adventure is over but life goes on for an elf mage just beginning to learn what living is all about. Elf mage Frieren and her courageous party just defeated the Demon King.",
    characterImage: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&h=900&fit=crop",
    bgGradient: "from-[#1a4a3a] via-[#152d25] to-[#0a1a15]"
  }
]

export function HeroCarousel({ anime }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % featuredShows.length)
  }, [])

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + featuredShows.length) % featuredShows.length)
  }, [])

  useEffect(() => {
    if (!isAutoPlaying) return
    const interval = setInterval(goToNext, 7000)
    return () => clearInterval(interval)
  }, [isAutoPlaying, goToNext])

  const currentShow = featuredShows[currentIndex]

  // Preload the first hero image for better LCP
  useEffect(() => {
    const firstImage = featuredShows[0].characterImage
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = firstImage
    link.fetchPriority = 'high'
    document.head.appendChild(link)
    return () => {
      document.head.removeChild(link)
    }
  }, [])

  return (
    <div 
      className="relative w-full h-[580px] md:h-[620px] lg:h-[660px] overflow-hidden"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* Background with gradient */}
      <div className={`absolute inset-0 bg-gradient-to-r ${currentShow.bgGradient}`}>
        {/* Textured overlay for depth */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(100,30,30,0.3)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(0,0,0,0.8)_0%,_transparent_60%)]" />
      </div>

      {/* Character Image - Right Side */}
      <div className="absolute right-0 top-0 bottom-0 w-[55%] md:w-[60%] lg:w-[65%]">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: `url(${currentShow.characterImage})`,
            backgroundPosition: 'center top'
          }}
        />
        {/* Left fade for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
      </div>

      {/* Content - Left Side */}
      <div className="relative h-full flex flex-col justify-center px-6 md:px-12 lg:px-14 max-w-[550px]">
        {/* Logo/Title in fancy serif style */}
        <h1 
          className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2 tracking-tight"
          style={{ 
            fontFamily: "'Times New Roman', 'Georgia', serif",
            textShadow: '2px 2px 8px rgba(0,0,0,0.8)'
          }}
        >
          {currentShow.title}
        </h1>

        {/* Subtitle with decorative arrows */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-[#F47521] text-lg">{"<"}{"-"}{"-"}</span>
          <span className="text-white text-sm md:text-base font-medium tracking-widest uppercase">
            {currentShow.subtitle}
          </span>
          <span className="text-[#F47521] text-lg">{"-"}{"-"}{">"}</span>
        </div>

        {/* Rating and Tags */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded border border-white/40 text-white text-xs font-medium">
            {currentShow.rating}
          </span>
          <span className="text-white/60 text-sm">{"•"}</span>
          {currentShow.tags.map((tag, i) => (
            <span key={tag} className="text-[#a0a0a0] text-sm">
              {tag}{i < currentShow.tags.length - 1 && <span className="text-white/40 mx-1">{","}</span>}
            </span>
          ))}
        </div>

        {/* Description */}
        <p className="text-[#a0a0a0] text-sm md:text-base leading-relaxed mb-6 line-clamp-4">
          {currentShow.description}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button 
            className="bg-[#F47521] hover:bg-[#e06515] text-white font-semibold px-5 py-2.5 h-auto rounded-sm flex items-center gap-2 text-sm"
          >
            <Play className="w-4 h-4 fill-white" />
            START WATCHING E1
          </Button>
          <Button 
            variant="outline" 
            className="border-white/40 bg-transparent text-white hover:bg-white/10 p-2.5 h-auto rounded-sm"
          >
            <Bookmark className="w-5 h-5" />
          </Button>
        </div>

        {/* Carousel Progress Indicators - Dashed Lines */}
        <div className="flex items-center gap-2 mt-10">
          {featuredShows.map((_, index) => (
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
    </div>
  )
}
