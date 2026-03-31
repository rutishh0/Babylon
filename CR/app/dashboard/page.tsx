import { trendingAnime, topPicks, continueWatching, newEpisodes } from "@/lib/mockData"
import { AnimeCarousel } from "@/components/AnimeCarousel"
import { HeroCarousel } from "@/components/HeroCarousel"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#000000]">
      {/* Hero Carousel */}
      <HeroCarousel anime={[]} />

      {/* Content Rows */}
      <div className="px-6 md:px-12 lg:px-14 pb-16 space-y-10 -mt-4">
        <AnimeCarousel title="Trending Anime in UAE" anime={trendingAnime} />
        <AnimeCarousel title="Top Picks for You" anime={topPicks} />
        <AnimeCarousel title="Continue Watching" anime={continueWatching} />
        <AnimeCarousel title="New Episodes" anime={newEpisodes} />
      </div>
    </div>
  )
}
