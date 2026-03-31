"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronDown, ChevronRight, Play, Filter } from "lucide-react"
import { animeList, filterOptions, trendingAnime, topPicks } from "@/lib/mockData"
import { AnimeCard } from "@/components/AnimeCard"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

// Promotional Banner Component
function PromoBanner({ 
  title, 
  subtitle, 
  image, 
  href 
}: { 
  title: string
  subtitle: string
  image: string
  href: string 
}) {
  return (
    <Link href={href} className="block col-span-full">
      <div className="relative w-full h-40 md:h-48 rounded-lg overflow-hidden group">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 flex items-center px-8">
          <div>
            <p className="text-sm text-[#F47521] font-medium mb-1">{subtitle}</p>
            <h3 className="text-2xl md:text-3xl font-bold text-white">{title}</h3>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function DiscoverPage() {
  const [sortBy, setSortBy] = useState("Popularity")
  const [selectedGenre, setSelectedGenre] = useState("All")
  const [languageFilter, setLanguageFilter] = useState("All")
  const [mediaFilter, setMediaFilter] = useState("All")
  const [filterOpen, setFilterOpen] = useState(false)

  const filteredAnime = selectedGenre === "All"
    ? animeList
    : animeList.filter(anime => anime.genres.includes(selectedGenre))

  const sortedAnime = [...filteredAnime].sort((a, b) => {
    switch (sortBy) {
      case "Rating":
        return b.rating - a.rating
      case "Newest":
        return b.releaseYear - a.releaseYear
      case "Alphabetical":
        return a.title.localeCompare(b.title)
      default:
        return 0
    }
  })

  // Combine all anime for a massive grid display like Crunchyroll
  const allAnimeGrid = [...sortedAnime, ...trendingAnime, ...topPicks].slice(0, 36)

  return (
    <div className="min-h-screen bg-[#000000]">
      {/* Header */}
      <div className="px-4 md:px-8 lg:px-12 pt-8 pb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-white">Popular Anime</h1>
            <Link href="/discover" className="text-[#a0a0a0] hover:text-white">
              <ChevronRight className="w-6 h-6" />
            </Link>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Genre Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-4 py-2 bg-[#23252b] rounded hover:bg-[#2a2c32] transition-colors">
                  <span className="text-sm text-white">{selectedGenre === "All" ? "All Genres" : selectedGenre}</span>
                  <ChevronDown className="w-4 h-4 text-white" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-64 overflow-y-auto bg-[#23252b] border-[#3a3c42]">
                <DropdownMenuRadioGroup value={selectedGenre} onValueChange={setSelectedGenre}>
                  <DropdownMenuRadioItem value="All" className="text-white focus:bg-[#2a2c32] focus:text-white">
                    All Genres
                  </DropdownMenuRadioItem>
                  {filterOptions.genres.map((genre) => (
                    <DropdownMenuRadioItem
                      key={genre}
                      value={genre}
                      className="text-white focus:bg-[#2a2c32] focus:text-white"
                    >
                      {genre}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-4 py-2 bg-[#23252b] rounded hover:bg-[#2a2c32] transition-colors">
                  <span className="text-sm text-white">Sort: {sortBy}</span>
                  <ChevronDown className="w-4 h-4 text-white" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#23252b] border-[#3a3c42]">
                <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
                  {filterOptions.sortBy.map((option) => (
                    <DropdownMenuRadioItem
                      key={option}
                      value={option}
                      className="text-white focus:bg-[#2a2c32] focus:text-white"
                    >
                      {option}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

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
                <DropdownMenuLabel className="text-xs text-[#a0a0a0] font-normal uppercase tracking-wider">
                  Language
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup value={languageFilter} onValueChange={setLanguageFilter}>
                  <DropdownMenuRadioItem value="All" className="text-white focus:bg-[#2a2c32] focus:text-white">
                    <span className={languageFilter === "All" ? "text-[#00d4ff]" : ""}>All</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="Subtitled" className="text-white focus:bg-[#2a2c32] focus:text-white">
                    <span className={languageFilter === "Subtitled" ? "text-[#00d4ff]" : ""}>Subtitled</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="Dubbed" className="text-white focus:bg-[#2a2c32] focus:text-white">
                    <span className={languageFilter === "Dubbed" ? "text-[#00d4ff]" : ""}>Dubbed</span>
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                
                <DropdownMenuSeparator className="bg-[#3a3c42]" />
                
                <DropdownMenuLabel className="text-xs text-[#a0a0a0] font-normal uppercase tracking-wider">
                  Media
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup value={mediaFilter} onValueChange={setMediaFilter}>
                  <DropdownMenuRadioItem value="All" className="text-white focus:bg-[#2a2c32] focus:text-white">
                    <span className={mediaFilter === "All" ? "text-[#00d4ff]" : ""}>All</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="Series" className="text-white focus:bg-[#2a2c32] focus:text-white">
                    <span className={mediaFilter === "Series" ? "text-[#00d4ff]" : ""}>Series</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="Movies" className="text-white focus:bg-[#2a2c32] focus:text-white">
                    <span className={mediaFilter === "Movies" ? "text-[#00d4ff]" : ""}>Movies</span>
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="px-4 md:px-8 lg:px-12 pb-4">
        <p className="text-sm text-[#a0a0a0]">{allAnimeGrid.length} titles</p>
      </div>

      {/* Anime Grid with Promotional Banners */}
      <div className="px-4 md:px-8 lg:px-12 pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {/* First 6 anime */}
          {allAnimeGrid.slice(0, 6).map((anime) => (
            <AnimeCard key={anime.id} anime={anime} variant="grid" />
          ))}

          {/* Promotional Banner 1 */}
          <PromoBanner
            title="Join the Crew!"
            subtitle="ONE PIECE FAN CELEBRATION"
            image="https://images.unsplash.com/photo-1607457561901-e6ec3a6d16cf?w=1200&h=400&fit=crop"
            href="/anime/8"
          />

          {/* Next 6 anime */}
          {allAnimeGrid.slice(6, 12).map((anime) => (
            <AnimeCard key={anime.id + "-b"} anime={anime} variant="grid" />
          ))}

          {/* More anime */}
          {allAnimeGrid.slice(12, 18).map((anime) => (
            <AnimeCard key={anime.id + "-c"} anime={anime} variant="grid" />
          ))}

          {/* Promotional Banner 2 */}
          <PromoBanner
            title="New Season Available"
            subtitle="DEMON SLAYER"
            image="https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&h=400&fit=crop"
            href="/anime/2"
          />

          {/* More anime */}
          {allAnimeGrid.slice(18, 30).map((anime) => (
            <AnimeCard key={anime.id + "-d"} anime={anime} variant="grid" />
          ))}

          {/* Promotional Banner 3 */}
          <PromoBanner
            title="Watch Now"
            subtitle="SOLO LEVELING - SEASON 2"
            image="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&h=400&fit=crop"
            href="/anime/1"
          />

          {/* Rest of anime */}
          {allAnimeGrid.slice(30).map((anime) => (
            <AnimeCard key={anime.id + "-e"} anime={anime} variant="grid" />
          ))}
        </div>
      </div>
    </div>
  )
}
