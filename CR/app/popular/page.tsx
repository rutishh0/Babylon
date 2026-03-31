"use client"

import { useState } from "react"
import { SlidersHorizontal, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AnimeCard } from "@/components/AnimeCard"
import { animeList, trendingAnime, topPicks } from "@/lib/mockData"

const sortOptions = ["Popular", "Newest", "Alphabetical", "Average Rating"]
const filterOptions = {
  language: ["All", "Subtitled", "Dubbed"],
  media: ["All", "Series", "Movies"]
}

export default function PopularPage() {
  const [sortBy, setSortBy] = useState("Popular")
  const [showFilters, setShowFilters] = useState(false)
  const [language, setLanguage] = useState("All")
  const [media, setMedia] = useState("All")

  // Combine all anime for popular page
  const allAnime = [...trendingAnime, ...topPicks, ...animeList].filter(
    (anime, index, self) => self.findIndex(a => a.id === anime.id) === index
  )

  return (
    <div className="min-h-screen bg-[#000000]">
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Popular Anime</h1>
          
          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-white hover:text-[#F47521] hover:bg-transparent"
              >
                <SlidersHorizontal className="w-4 h-4" />
                {sortBy}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>

            {/* Filter Button */}
            <Button
              variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 hover:bg-transparent ${
                showFilters ? "text-[#F47521]" : "text-white hover:text-[#F47521]"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              FILTER
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-[#141519] rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Language Filter */}
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Language</h4>
                <div className="space-y-2">
                  {filterOptions.language.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        language === opt ? "border-[#00a8e1]" : "border-[#4a4c52]"
                      }`}>
                        {language === opt && (
                          <div className="w-2 h-2 rounded-full bg-[#00a8e1]" />
                        )}
                      </div>
                      <span className="text-sm text-white">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Media Filter */}
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Media</h4>
                <div className="space-y-2">
                  {filterOptions.media.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        media === opt ? "border-[#00a8e1]" : "border-[#4a4c52]"
                      }`}>
                        {media === opt && (
                          <div className="w-2 h-2 rounded-full bg-[#00a8e1]" />
                        )}
                      </div>
                      <span className="text-sm text-white">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Anime Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {allAnime.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} variant="grid" />
          ))}
        </div>
      </div>
    </div>
  )
}
