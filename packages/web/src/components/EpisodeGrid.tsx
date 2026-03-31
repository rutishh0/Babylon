"use client"

import { useState } from "react"
import Link from "next/link"
import { Download, Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface EpisodeData {
  anime_id: string
  number: number
  provider: string
  language: string
  is_downloaded?: boolean
}

interface EpisodeGridProps {
  episodes: EpisodeData[]
  animeId: string
  animeTitle: string
  onDownloadSelected?: (episodes: number[]) => void
  downloadedEpisodes?: Set<number>
  showDownloadControls?: boolean
}

export default function EpisodeGrid({
  episodes,
  animeId,
  animeTitle,
  onDownloadSelected,
  downloadedEpisodes,
  showDownloadControls = false,
}: EpisodeGridProps) {
  const [sortOrder, setSortOrder] = useState<"oldest" | "newest">("oldest")
  const [showAll, setShowAll] = useState(false)
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<number>>(new Set())

  // Sort episodes
  const sortedEpisodes =
    sortOrder === "newest" ? [...episodes].reverse() : [...episodes]

  // Limit display unless showAll
  const INITIAL_DISPLAY_COUNT = 12
  const displayEpisodes = showAll
    ? sortedEpisodes
    : sortedEpisodes.slice(0, INITIAL_DISPLAY_COUNT)

  const isEpisodeDownloaded = (epNumber: number): boolean => {
    if (downloadedEpisodes) return downloadedEpisodes.has(epNumber)
    const ep = episodes.find((e) => e.number === epNumber)
    return ep?.is_downloaded ?? false
  }

  const toggleEpisodeSelection = (epNumber: number) => {
    setSelectedEpisodes((prev) => {
      const next = new Set(prev)
      if (next.has(epNumber)) {
        next.delete(epNumber)
      } else {
        next.add(epNumber)
      }
      return next
    })
  }

  const handleDownloadSelected = () => {
    if (onDownloadSelected && selectedEpisodes.size > 0) {
      onDownloadSelected(Array.from(selectedEpisodes).sort((a, b) => a - b))
      setSelectedEpisodes(new Set())
    }
  }

  const selectAll = () => {
    const allNums = new Set(
      sortedEpisodes
        .filter((ep) => !isEpisodeDownloaded(ep.number))
        .map((ep) => ep.number)
    )
    setSelectedEpisodes(allNums)
  }

  return (
    <div>
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h3 className="text-lg font-bold text-white">
          Episodes ({episodes.length})
        </h3>

        <div className="flex items-center gap-2">
          {/* Download Controls */}
          {showDownloadControls && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                className="bg-[#23252b] border-[#3a3c42] text-white hover:bg-[#2a2c32] hover:text-white rounded-sm text-xs"
              >
                Select All
              </Button>
              {selectedEpisodes.size > 0 && (
                <Button
                  size="sm"
                  onClick={handleDownloadSelected}
                  className="bg-[#F47521] hover:bg-[#e06515] text-white rounded-sm text-xs"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Download ({selectedEpisodes.size})
                </Button>
              )}
            </>
          )}

          {/* Sort Toggle */}
          <button
            onClick={() =>
              setSortOrder(sortOrder === "oldest" ? "newest" : "oldest")
            }
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white hover:bg-[#23252b] rounded transition-colors"
          >
            <span className="uppercase text-xs font-medium">
              {sortOrder === "oldest" ? "OLDEST" : "NEWEST"}
            </span>
            <ChevronDown
              className={`w-3 h-3 transition-transform ${
                sortOrder === "newest" ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Episodes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
        {displayEpisodes.map((episode) => {
          const downloaded = isEpisodeDownloaded(episode.number)
          const isSelected = selectedEpisodes.has(episode.number)

          return (
            <div
              key={`${episode.number}-${episode.language}`}
              className="group relative"
            >
              {/* Checkbox for batch selection */}
              {showDownloadControls && !downloaded && (
                <button
                  onClick={() => toggleEpisodeSelection(episode.number)}
                  className={`absolute top-2 left-2 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-[#F47521] border-[#F47521]"
                      : "border-white/50 bg-black/40 hover:border-white"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </button>
              )}

              {downloaded ? (
                <Link
                  href={`/watch/${animeId}?ep=${episode.number}`}
                  className="block"
                >
                  <EpisodeCard
                    episode={episode}
                    downloaded={true}
                    animeTitle={animeTitle}
                  />
                </Link>
              ) : (
                <div
                  className="cursor-pointer"
                  onClick={() => {
                    if (showDownloadControls) {
                      toggleEpisodeSelection(episode.number)
                    } else if (onDownloadSelected) {
                      onDownloadSelected([episode.number])
                    }
                  }}
                >
                  <EpisodeCard
                    episode={episode}
                    downloaded={false}
                    animeTitle={animeTitle}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Show All Episodes Button */}
      {sortedEpisodes.length > INITIAL_DISPLAY_COUNT && !showAll && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => setShowAll(true)}
            className="bg-transparent border-[#3a3c42] text-white hover:bg-[#23252b] hover:text-white rounded-sm"
          >
            Show All Episodes ({sortedEpisodes.length})
          </Button>
        </div>
      )}
    </div>
  )
}

function EpisodeCard({
  episode,
  downloaded,
  animeTitle,
}: {
  episode: EpisodeData
  downloaded: boolean
  animeTitle: string
}) {
  return (
    <div className="bg-[#141519] hover:bg-[#1a1c22] border border-[#2a2c32] rounded-lg p-4 transition-colors group-hover:border-[#3a3c42]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-semibold text-base">
          Episode {episode.number}
        </span>
        {/* Download status badge */}
        {downloaded ? (
          <span className="flex items-center gap-1 text-green-500 text-xs font-medium">
            <Check className="w-3.5 h-3.5" />
            Downloaded
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[#a0a0a0] text-xs">
            <Download className="w-3.5 h-3.5" />
            Available
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs px-1.5 py-0.5 bg-[#23252b] text-[#a0a0a0] rounded">
          {episode.language === "sub" ? "Sub" : episode.language === "dub" ? "Dub" : episode.language}
        </span>
        {episode.provider && (
          <span className="text-xs text-[#666]">
            {episode.provider}
          </span>
        )}
      </div>
    </div>
  )
}
