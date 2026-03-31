"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Play, ChevronDown, ArrowUpDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Anime, Episode } from "@/lib/mockData"

interface EpisodeGridProps {
  anime: Anime
  episodes: Episode[]
}

export function EpisodeGrid({ anime, episodes }: EpisodeGridProps) {
  const [selectedSeason, setSelectedSeason] = useState("Season 1")
  const [sortOrder, setSortOrder] = useState<"oldest" | "newest">("oldest")
  const [showMore, setShowMore] = useState(false)

  // Generate seasons based on episode count
  const episodesPerSeason = 24
  const seasonCount = Math.ceil(episodes.length / episodesPerSeason)
  const seasons = Array.from({ length: seasonCount }, (_, i) => `Season ${i + 1}`)

  // Get episodes for selected season
  const seasonIndex = parseInt(selectedSeason.replace("Season ", "")) - 1
  const seasonEpisodes = episodes.slice(
    seasonIndex * episodesPerSeason,
    (seasonIndex + 1) * episodesPerSeason
  )

  // Sort episodes
  const sortedEpisodes = sortOrder === "newest" 
    ? [...seasonEpisodes].reverse() 
    : seasonEpisodes

  // Limit display unless showMore
  const displayEpisodes = showMore ? sortedEpisodes : sortedEpisodes.slice(0, 8)

  return (
    <div>
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          {/* Season Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-[#23252b] border-[#3a3c42] text-white hover:bg-[#2a2c32] hover:text-white rounded-sm h-9">
                {selectedSeason}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#23252b] border-[#3a3c42]">
              {seasons.map((season) => (
                <DropdownMenuItem
                  key={season}
                  onClick={() => setSelectedSeason(season)}
                  className="text-white hover:bg-[#2a2c32] focus:bg-[#2a2c32] focus:text-white"
                >
                  {season}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort Toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === "oldest" ? "newest" : "oldest")}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-[#23252b] rounded transition-colors"
          >
            <span className="uppercase text-xs font-medium">
              {sortOrder === "oldest" ? "OLDEST" : "NEWEST"}
            </span>
          </button>

          {/* Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-[#23252b] rounded transition-colors">
                <span className="uppercase text-xs font-medium">OPTIONS</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#23252b] border-[#3a3c42]">
              <DropdownMenuItem className="text-white hover:bg-[#2a2c32] focus:bg-[#2a2c32] focus:text-white">
                Mark All Watched
              </DropdownMenuItem>
              <DropdownMenuItem className="text-white hover:bg-[#2a2c32] focus:bg-[#2a2c32] focus:text-white">
                Download All
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Episodes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {displayEpisodes.map((episode) => (
          <Link
            key={episode.id}
            href={`/player/${anime.id}?ep=${episode.number}`}
            className="group"
          >
            <div className="relative aspect-video rounded overflow-hidden bg-[#23252b] mb-2">
              <Image
                src={episode.thumbnail}
                alt={`Episode ${episode.number}`}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="p-2.5 rounded-full bg-[#F47521]">
                  <Play className="w-5 h-5 text-white fill-white" />
                </div>
              </div>
              <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-xs text-white">
                {episode.duration}
              </div>
            </div>
            <h4 className="text-sm font-medium text-white group-hover:text-[#F47521] transition-colors line-clamp-1">
              E{episode.number} - {episode.title}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-1.5 py-0.5 bg-[#23252b] text-white rounded">Sub</span>
              {anime.subDub.includes("dub") && (
                <span className="text-xs px-1.5 py-0.5 bg-[#F47521] text-white rounded">Dub</span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Show More Button */}
      {sortedEpisodes.length > 8 && !showMore && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => setShowMore(true)}
            className="bg-transparent border-[#3a3c42] text-white hover:bg-[#23252b] hover:text-white rounded-sm"
          >
            Show All Episodes ({sortedEpisodes.length})
          </Button>
        </div>
      )}
    </div>
  )
}
