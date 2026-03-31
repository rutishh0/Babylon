"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronDown, Play, Filter } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { animeList } from "@/lib/mockData"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

// Generate newly added episodes/anime data
const generateNewlyAddedData = () => {
  const last24Hours = [
    { anime: animeList[0], episodeNumber: 13, title: "Episode 13", isNew: true },
    { anime: animeList[8], episodeNumber: 29, title: "Episode 29", isNew: true },
    { anime: animeList[5], episodeNumber: 38, title: "Episode 38", isNew: true },
    { anime: animeList[2], episodeNumber: 48, title: "Episode 48", isNew: true },
  ]

  const pastWeek = [
    { anime: animeList[1], episodeNumber: 45, title: "Episode 45", isNew: false },
    { anime: animeList[6], episodeNumber: 13, title: "Episode 13", isNew: false },
    { anime: animeList[3], episodeNumber: 139, title: "Episode 139", isNew: false },
    { anime: animeList[9], episodeNumber: 25, title: "Episode 25", isNew: false },
    { anime: animeList[10], episodeNumber: 12, title: "Episode 12", isNew: false },
    { anime: animeList[11], episodeNumber: 36, title: "Episode 36", isNew: false },
    { anime: animeList[4], episodeNumber: 87, title: "Episode 87", isNew: false },
    { anime: animeList[7], episodeNumber: 1100, title: "Episode 1100", isNew: false },
  ]

  return { last24Hours, pastWeek }
}

export default function NewlyAddedPage() {
  const [languageFilter, setLanguageFilter] = useState("All")
  const [mediaFilter, setMediaFilter] = useState("All")
  const [filterOpen, setFilterOpen] = useState(false)

  const { last24Hours, pastWeek } = generateNewlyAddedData()

  const EpisodeCard = ({ item }: { item: { anime: typeof animeList[0]; episodeNumber: number; title: string; isNew: boolean } }) => (
    <Link
      href={`/player/${item.anime.id}?ep=${item.episodeNumber}`}
      className="group"
    >
      <div className="relative aspect-video rounded overflow-hidden mb-2">
        <Image
          src={item.anime.thumbnail.replace("400", "640").replace("600", "360")}
          alt={item.anime.title}
          fill
          className="object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="p-3 rounded-full bg-[#F47521]">
            <Play className="w-6 h-6 text-white fill-white" />
          </div>
        </div>
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-xs text-white">
          23:40
        </div>
        {item.isNew && (
          <Badge className="absolute top-2 left-2 bg-[#F47521] text-white border-none text-xs px-1.5 py-0">
            NEW
          </Badge>
        )}
      </div>
      <h3 className="text-sm font-medium text-white group-hover:text-[#F47521] transition-colors line-clamp-1">
        {item.anime.title}
      </h3>
      <p className="text-xs text-[#a0a0a0] mt-0.5">
        E{item.episodeNumber} - {item.title}
      </p>
      <div className="flex items-center gap-2 mt-1">
        {item.anime.subDub.includes("sub") && (
          <span className="text-xs px-1.5 py-0.5 bg-[#23252b] text-white rounded">Sub</span>
        )}
        {item.anime.subDub.includes("dub") && (
          <span className="text-xs px-1.5 py-0.5 bg-[#F47521] text-white rounded">Dub</span>
        )}
      </div>
    </Link>
  )

  return (
    <div className="min-h-screen bg-[#000000]">
      {/* Header */}
      <div className="px-4 md:px-8 lg:px-12 pt-8 pb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Newly Added Anime</h1>
          
          {/* Filter Button */}
          <DropdownMenu open={filterOpen} onOpenChange={setFilterOpen}>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 bg-[#23252b] rounded hover:bg-[#2a2c32] transition-colors">
                <Filter className="w-4 h-4 text-white" />
                <span className="text-sm text-white">Filter</span>
                <ChevronDown className={`w-4 h-4 text-white transition-transform ${filterOpen ? "rotate-180" : ""}`} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-[#23252b] border-[#3a3c42]">
              {/* Language Section */}
              <DropdownMenuLabel className="text-xs text-[#a0a0a0] font-normal uppercase tracking-wider">
                Language
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup value={languageFilter} onValueChange={setLanguageFilter}>
                <DropdownMenuRadioItem 
                  value="All" 
                  className="text-white focus:bg-[#2a2c32] focus:text-white"
                >
                  <span className={languageFilter === "All" ? "text-[#00d4ff]" : ""}>All</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem 
                  value="Subtitled" 
                  className="text-white focus:bg-[#2a2c32] focus:text-white"
                >
                  <span className={languageFilter === "Subtitled" ? "text-[#00d4ff]" : ""}>Subtitled</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem 
                  value="Dubbed" 
                  className="text-white focus:bg-[#2a2c32] focus:text-white"
                >
                  <span className={languageFilter === "Dubbed" ? "text-[#00d4ff]" : ""}>Dubbed</span>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              
              <DropdownMenuSeparator className="bg-[#3a3c42]" />
              
              {/* Media Section */}
              <DropdownMenuLabel className="text-xs text-[#a0a0a0] font-normal uppercase tracking-wider">
                Media
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup value={mediaFilter} onValueChange={setMediaFilter}>
                <DropdownMenuRadioItem 
                  value="All" 
                  className="text-white focus:bg-[#2a2c32] focus:text-white"
                >
                  <span className={mediaFilter === "All" ? "text-[#00d4ff]" : ""}>All</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem 
                  value="Series" 
                  className="text-white focus:bg-[#2a2c32] focus:text-white"
                >
                  <span className={mediaFilter === "Series" ? "text-[#00d4ff]" : ""}>Series</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem 
                  value="Movies" 
                  className="text-white focus:bg-[#2a2c32] focus:text-white"
                >
                  <span className={mediaFilter === "Movies" ? "text-[#00d4ff]" : ""}>Movies</span>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Last 24 Hours Section */}
      <div className="px-4 md:px-8 lg:px-12 mb-10">
        <h2 className="text-lg font-semibold text-white mb-4 border-b border-[#23252b] pb-2">
          Last 24 Hours
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {last24Hours.map((item, index) => (
            <EpisodeCard key={`24h-${index}`} item={item} />
          ))}
        </div>
      </div>

      {/* This Past Week Section */}
      <div className="px-4 md:px-8 lg:px-12 pb-12">
        <h2 className="text-lg font-semibold text-white mb-4 border-b border-[#23252b] pb-2">
          This Past Week
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {pastWeek.map((item, index) => (
            <EpisodeCard key={`week-${index}`} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}
