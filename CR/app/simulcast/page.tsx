"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronDown, Play, Filter } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { simulcastSchedule, animeList } from "@/lib/mockData"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

// Generate chronological episode data
const generateEpisodeData = () => {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const twoDaysAgo = new Date(today)
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

  const episodes = [
    // Today
    { anime: animeList[0], episodeNumber: 13, title: "Episode 13", date: today, time: "12:00 PM", isNew: true },
    { anime: animeList[8], episodeNumber: 29, title: "Episode 29", date: today, time: "11:30 AM", isNew: true },
    { anime: animeList[5], episodeNumber: 38, title: "Episode 38", date: today, time: "10:00 AM", isNew: true },
    // Yesterday
    { anime: animeList[1], episodeNumber: 45, title: "Episode 45", date: yesterday, time: "3:00 PM", isNew: false },
    { anime: animeList[2], episodeNumber: 48, title: "Episode 48", date: yesterday, time: "1:30 PM", isNew: false },
    { anime: animeList[6], episodeNumber: 13, title: "Episode 13", date: yesterday, time: "11:00 AM", isNew: false },
    // 2 Days Ago
    { anime: animeList[3], episodeNumber: 139, title: "Episode 139", date: twoDaysAgo, time: "4:30 PM", isNew: false },
    { anime: animeList[9], episodeNumber: 25, title: "Episode 25", date: twoDaysAgo, time: "2:00 PM", isNew: false },
  ]

  return episodes
}

const formatDate = (date: Date) => {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return "Today"
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday"
  } else {
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
  }
}

export default function SimulcastPage() {
  const [languageFilter, setLanguageFilter] = useState("All")
  const [mediaFilter, setMediaFilter] = useState("All")
  const [filterOpen, setFilterOpen] = useState(false)

  const episodes = generateEpisodeData()

  // Group episodes by date
  const groupedEpisodes = episodes.reduce((acc, episode) => {
    const dateKey = episode.date.toDateString()
    if (!acc[dateKey]) {
      acc[dateKey] = { date: episode.date, episodes: [] }
    }
    acc[dateKey].episodes.push(episode)
    return acc
  }, {} as Record<string, { date: Date; episodes: typeof episodes }>)

  return (
    <div className="min-h-screen bg-[#000000]">
      {/* Header */}
      <div className="px-4 md:px-8 lg:px-12 pt-8 pb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Simulcasts</h1>
          
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
                  className="text-white focus:bg-[#2a2c32] focus:text-white data-[state=checked]:text-[#00d4ff]"
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

      {/* Episode List by Date */}
      <div className="px-4 md:px-8 lg:px-12 pb-12">
        {Object.values(groupedEpisodes).map((group) => (
          <div key={group.date.toDateString()} className="mb-8">
            {/* Date Header */}
            <h2 className="text-lg font-semibold text-white mb-4 border-b border-[#23252b] pb-2">
              {formatDate(group.date)}
            </h2>

            {/* Episodes */}
            <div className="space-y-3">
              {group.episodes.map((episode, index) => (
                <Link
                  key={`${episode.anime.id}-${episode.episodeNumber}`}
                  href={`/player/${episode.anime.id}?ep=${episode.episodeNumber}`}
                  className="flex gap-4 hover:bg-[#141519] rounded-lg transition-colors group p-2 -mx-2"
                >
                  {/* Thumbnail */}
                  <div className="w-48 md:w-56 flex-shrink-0">
                    <div className="relative aspect-video rounded overflow-hidden">
                      <Image
                        src={episode.anime.thumbnail.replace("400", "640").replace("600", "360")}
                        alt={episode.anime.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="p-2 rounded-full bg-[#F47521]">
                          <Play className="w-5 h-5 text-white fill-white" />
                        </div>
                      </div>
                      {/* Duration badge */}
                      <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-xs text-white">
                        23:40
                      </div>
                      {episode.isNew && (
                        <Badge className="absolute top-2 left-2 bg-[#F47521] text-white border-none text-xs px-1.5 py-0">
                          NEW
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Episode Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="text-base font-medium text-white mb-1 group-hover:text-[#F47521] transition-colors line-clamp-1">
                      {episode.anime.title}
                    </h3>
                    <p className="text-sm text-[#a0a0a0] mb-2 line-clamp-1">
                      E{episode.episodeNumber} - {episode.title}
                    </p>
                    <div className="flex items-center gap-2">
                      {episode.anime.subDub.includes("sub") && (
                        <span className="text-xs px-2 py-0.5 bg-[#23252b] text-white rounded">Sub</span>
                      )}
                      {episode.anime.subDub.includes("dub") && (
                        <span className="text-xs px-2 py-0.5 bg-[#F47521] text-white rounded">Dub</span>
                      )}
                    </div>
                  </div>

                  {/* Time - Right aligned */}
                  <div className="hidden md:flex items-center justify-end min-w-[80px]">
                    <span className="text-sm text-[#00a7e1]">{episode.time}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
