"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Play, Heart, Trash2, Plus } from "lucide-react"
import { watchlistItems, animeList } from "@/lib/mockData"

export default function WatchlistPage() {
  const [activeTab, setActiveTab] = useState<"watchlist" | "crunchylists" | "history">("watchlist")

  return (
    <div className="min-h-screen bg-[#000000]">
      {/* Header with Tabs */}
      <div className="px-4 md:px-8 lg:px-12 pt-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">My Lists</h1>
        
        {/* Tabs */}
        <div className="flex border-b border-[#23252b]">
          <button
            onClick={() => setActiveTab("watchlist")}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === "watchlist"
                ? "text-[#F47521]"
                : "text-[#a0a0a0] hover:text-white"
            }`}
          >
            WATCHLIST
            {activeTab === "watchlist" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F47521]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("crunchylists")}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === "crunchylists"
                ? "text-[#F47521]"
                : "text-[#a0a0a0] hover:text-white"
            }`}
          >
            CRUNCHYLISTS
            {activeTab === "crunchylists" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F47521]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === "history"
                ? "text-[#F47521]"
                : "text-[#a0a0a0] hover:text-white"
            }`}
          >
            HISTORY
            {activeTab === "history" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F47521]" />
            )}
          </button>
        </div>
      </div>

      {/* Watchlist Tab Content */}
      {activeTab === "watchlist" && (
        <div className="px-4 md:px-8 lg:px-12 py-8">
          <h2 className="text-lg font-medium text-white mb-6">Recent Activity</h2>
          
          {/* Landscape Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {watchlistItems.map((anime) => (
              <div
                key={anime.id}
                className="group relative rounded overflow-hidden"
              >
                {/* Thumbnail */}
                <Link href={`/anime/${anime.id}`} className="block">
                  <div className="relative aspect-video">
                    <Image
                      src={anime.thumbnail.replace("400", "640").replace("600", "360")}
                      alt={anime.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="p-3 rounded-full bg-[#F47521]">
                        <Play className="w-6 h-6 text-white fill-white" />
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Action Buttons */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 bg-black/70 rounded-full hover:bg-black/90 transition-colors">
                    <Heart className="w-4 h-4 text-white" />
                  </button>
                  <button className="p-1.5 bg-black/70 rounded-full hover:bg-black/90 transition-colors">
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Info */}
                <div className="p-3 bg-[#141519]">
                  <Link href={`/anime/${anime.id}`}>
                    <h3 className="text-sm font-medium text-white hover:text-[#F47521] transition-colors line-clamp-1">
                      {anime.title}
                    </h3>
                  </Link>
                  <p className="text-xs text-[#a0a0a0] mt-1">
                    E1 - Episode 1
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Crunchylists Tab Content */}
      {activeTab === "crunchylists" && (
        <div className="px-4 md:px-8 lg:px-12 py-8">
          {/* Create New List Button */}
          <div className="mb-8">
            <Link
              href="/user/crunchylists"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#F47521] hover:bg-[#e06515] text-white rounded-sm font-medium text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              CREATE NEW LIST
            </Link>
          </div>

          {/* Lists Grid as Folders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { id: "1", name: "My Favorites", count: 5 },
              { id: "2", name: "Watch Later", count: 8 },
              { id: "3", name: "Best Action Shows", count: 6 },
            ].map((list) => (
              <Link
                key={list.id}
                href={`/user/crunchylists/${list.id}`}
                className="group"
              >
                <div className="aspect-video bg-[#23252b] rounded overflow-hidden relative mb-2">
                  {/* Folder Icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-16 h-16 text-[#3a3c42] group-hover:text-[#F47521] transition-colors" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                    </svg>
                  </div>
                </div>
                <h3 className="text-sm font-medium text-white group-hover:text-[#F47521] transition-colors">
                  {list.name}
                </h3>
                <p className="text-xs text-[#a0a0a0] mt-0.5">
                  {list.count} items
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* History Tab Content */}
      {activeTab === "history" && (
        <div className="px-4 md:px-8 lg:px-12 py-8">
          <div className="space-y-3">
            {animeList.slice(0, 6).map((anime, index) => (
              <div
                key={anime.id}
                className="flex gap-4 p-3 hover:bg-[#141519] rounded-lg transition-colors group"
              >
                {/* Thumbnail */}
                <Link href={`/anime/${anime.id}`} className="w-40 md:w-48 flex-shrink-0">
                  <div className="relative aspect-video rounded overflow-hidden">
                    <Image
                      src={anime.thumbnail.replace("400", "640").replace("600", "360")}
                      alt={anime.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="p-2 rounded-full bg-[#F47521]">
                        <Play className="w-5 h-5 text-white fill-white" />
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <Link href={`/anime/${anime.id}`}>
                    <h3 className="text-base font-medium text-white hover:text-[#F47521] transition-colors line-clamp-1">
                      {anime.title}
                    </h3>
                  </Link>
                  <p className="text-sm text-[#a0a0a0] mt-1">
                    E{index + 1} - Episode {index + 1}
                  </p>
                  {/* Progress Bar */}
                  <div className="w-full max-w-xs h-1 bg-[#23252b] rounded-full mt-2">
                    <div
                      className="h-full bg-[#F47521] rounded-full"
                      style={{ width: `${Math.random() * 60 + 20}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#a0a0a0] mt-1">
                    Watched {index + 1} {index === 0 ? "day" : "days"} ago
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
