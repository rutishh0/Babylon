"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Bookmark, Play, Trash2, SlidersHorizontal, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { animeList } from "@/lib/mockData"

// Mock history data with progress
const historyData = animeList.slice(0, 12).map((anime, index) => ({
  ...anime,
  watchedAt: new Date(Date.now() - index * 3600000 * (index + 1)).toISOString(),
  episodeNumber: Math.floor(Math.random() * 24) + 1,
  progress: Math.floor(Math.random() * 100),
  duration: "24:00"
}))

// Group by date
function groupByDate(items: typeof historyData) {
  const groups: { [key: string]: typeof historyData } = {}
  
  items.forEach(item => {
    const date = new Date(item.watchedAt)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    let key: string
    if (date.toDateString() === today.toDateString()) {
      key = "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = "Yesterday"
    } else {
      key = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    }
    
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  })
  
  return groups
}

export default function HistoryPage() {
  const [showFilters, setShowFilters] = useState(false)
  const groupedHistory = groupByDate(historyData)

  return (
    <div className="min-h-screen bg-[#000000]">
      <div className="max-w-[1200px] mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bookmark className="w-6 h-6 text-white" />
            <h1 className="text-2xl md:text-3xl font-bold text-white">My Lists</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-[#2a2c32] mb-6">
          <nav className="flex gap-8">
            <Link
              href="/user/watchlist"
              className="pb-3 text-sm font-medium text-[#a0a0a0] hover:text-white transition-colors"
            >
              WATCHLIST
            </Link>
            <Link
              href="/user/crunchylists"
              className="pb-3 text-sm font-medium text-[#a0a0a0] hover:text-white transition-colors"
            >
              CRUNCHYLISTS
            </Link>
            <button className="pb-3 text-sm font-medium text-white border-b-2 border-[#F47521]">
              HISTORY
            </button>
          </nav>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Watch History</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-white hover:text-[#F47521] hover:bg-transparent"
            >
              <SlidersHorizontal className="w-4 h-4" />
              RECENT ACTIVITY
              <ChevronDown className="w-4 h-4" />
            </Button>
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

        {/* History Groups */}
        {Object.entries(groupedHistory).map(([date, items]) => (
          <div key={date} className="mb-8">
            <h3 className="text-sm font-medium text-[#a0a0a0] uppercase tracking-wider mb-4">
              {date}
            </h3>
            
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={`${item.id}-${item.watchedAt}`}
                  className="group flex gap-4 p-3 bg-[#141519] rounded-lg hover:bg-[#1a1a1f] transition-colors"
                >
                  {/* Thumbnail */}
                  <Link href={`/player/${item.id}`} className="flex-shrink-0">
                    <div className="relative w-40 md:w-48">
                      <div className="relative aspect-video rounded overflow-hidden">
                        <Image
                          src={item.thumbnail.replace("400", "640").replace("600", "360")}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="p-2 rounded-full bg-[#F47521]">
                            <Play className="w-5 h-5 text-white fill-white" />
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#3a3c42]">
                          <div 
                            className="h-full bg-[#F47521]"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/anime/${item.id}`}>
                      <p className="text-sm text-[#F47521] mb-1">{item.title}</p>
                    </Link>
                    <h4 className="text-white font-medium mb-1 line-clamp-2">
                      E{item.episodeNumber} - Episode Title Goes Here
                    </h4>
                    <p className="text-sm text-[#a0a0a0]">
                      {item.subDub.includes("dub") ? "Dub | Sub" : "Subtitled"}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-start gap-2">
                    <button className="p-2 text-[#a0a0a0] hover:text-red-500 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Clear History */}
        <div className="text-center py-8">
          <Button
            variant="outline"
            className="border-[#3a3c42] text-white hover:bg-[#23252b] hover:text-white"
          >
            Clear Watch History
          </Button>
        </div>
      </div>
    </div>
  )
}
