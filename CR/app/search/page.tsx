"use client"

import { useState } from "react"
import { Search, X } from "lucide-react"
import { animeList, recentSearches } from "@/lib/mockData"
import { AnimeCard } from "@/components/AnimeCard"
import Link from "next/link"

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [searches, setSearches] = useState(recentSearches)

  const filteredAnime = query.length > 0
    ? animeList.filter(anime =>
        anime.title.toLowerCase().includes(query.toLowerCase()) ||
        anime.genres.some(g => g.toLowerCase().includes(query.toLowerCase()))
      )
    : []

  const removeSearch = (search: string) => {
    setSearches(searches.filter(s => s !== search))
  }

  const clearAllSearches = () => {
    setSearches([])
  }

  const handleSearchClick = (search: string) => {
    setQuery(search)
  }

  return (
    <div className="min-h-screen bg-[#000000]">
      {/* Search Header - Large centered search */}
      <div className="pt-16 pb-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 text-[#a0a0a0]" />
            <input
              type="text"
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="w-full pl-12 pr-12 py-4 bg-transparent text-white placeholder:text-[#a0a0a0] text-3xl md:text-4xl font-light border-b border-[#3a3c42] focus:outline-none focus:border-[#F47521]"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 hover:bg-[#23252b] rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-[#a0a0a0]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recent Searches */}
      {query.length === 0 && searches.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-white">Recent Search Results</h2>
            <button 
              onClick={clearAllSearches}
              className="text-sm text-[#00a7e1] hover:underline"
            >
              CLEAR RECENT
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {searches.map((search) => (
              <button
                key={search}
                onClick={() => handleSearchClick(search)}
                className="group flex items-center gap-2 px-4 py-2 bg-[#23252b] hover:bg-[#2a2c32] rounded-full transition-colors"
              >
                <span className="text-sm text-white">{search}</span>
                <X
                  className="w-4 h-4 text-[#a0a0a0] hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeSearch(search)
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {query.length > 0 && (
        <div className="px-4 md:px-8 lg:px-12 pb-12">
          <p className="text-sm text-[#a0a0a0] mb-6">
            {filteredAnime.length} results for &quot;{query}&quot;
          </p>
          
          {filteredAnime.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredAnime.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} variant="grid" />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Search className="w-20 h-20 text-[#23252b] mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">No results found</h3>
              <p className="text-[#a0a0a0]">Try searching for something else</p>
            </div>
          )}
        </div>
      )}

      {/* Browse Popular when no search */}
      {query.length === 0 && (
        <div className="px-4 md:px-8 lg:px-12 pb-12">
          <h2 className="text-xl font-semibold text-white mb-6">Browse Popular</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {animeList.slice(0, 12).map((anime) => (
              <AnimeCard key={anime.id} anime={anime} variant="grid" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
