import Image from "next/image"
import Link from "next/link"
import { Play, Plus, Star, ChevronDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { animeList, episodesList } from "@/lib/mockData"
import { EpisodeGrid } from "@/components/EpisodeGrid"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AnimeDetailPage({ params }: PageProps) {
  const { id } = await params
  const anime = animeList.find(a => a.id === id) || animeList[0]
  const episodes = episodesList.filter(e => e.animeId === anime.id)

  // Generate more episodes for display
  const allEpisodes = Array.from({ length: anime.episodeCount }, (_, i) => ({
    id: `e${anime.id}-${i + 1}`,
    animeId: anime.id,
    number: i + 1,
    title: episodes[i % episodes.length]?.title || `Episode ${i + 1}`,
    thumbnail: anime.thumbnail.replace("400", "640").replace("600", "360"),
    duration: "23:40",
    releaseDate: "2024-01-01",
    synopsis: "Episode synopsis...",
    subDub: "sub" as const
  }))

  return (
    <div className="min-h-screen bg-[#000000]">
      {/* Hero Section with Blurred Background */}
      <div className="relative h-[450px] md:h-[500px]">
        <Image
          src={anime.coverImage}
          alt={anime.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/70 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-transparent to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 flex items-end">
          <div className="px-4 md:px-8 lg:px-12 pb-6 w-full">
            <div className="flex gap-6 md:gap-8">
              {/* Poster */}
              <div className="hidden md:block w-44 lg:w-52 flex-shrink-0 -mb-20 relative z-10">
                <div className="aspect-[2/3] rounded overflow-hidden shadow-2xl">
                  <Image
                    src={anime.thumbnail}
                    alt={anime.title}
                    width={208}
                    height={312}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 pb-2">
                {/* Title */}
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 text-balance">
                  {anime.title}
                </h1>

                {/* Rating Stars */}
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star}
                      className={`w-5 h-5 ${star <= Math.round(anime.rating) ? "text-[#FFD700] fill-[#FFD700]" : "text-[#3a3c42]"}`}
                    />
                  ))}
                  <span className="text-sm text-white ml-2">Average Rating: {anime.rating}</span>
                </div>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-white mb-4">
                  {anime.subDub.includes("sub") && (
                    <Badge variant="outline" className="text-white border-white/50 bg-transparent rounded-none text-xs font-normal px-2 py-0">
                      Sub
                    </Badge>
                  )}
                  {anime.subDub.includes("dub") && (
                    <Badge className="bg-[#F47521] text-white border-none rounded-none text-xs font-normal px-2 py-0">
                      Dub
                    </Badge>
                  )}
                  <span>{anime.episodeCount} Episodes</span>
                  <span>|</span>
                  <span className="capitalize">{anime.status === "completed" ? "Completed" : "Simulcast"}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <Link href={`/player/${anime.id}`}>
                    <Button className="bg-[#F47521] hover:bg-[#e06515] text-white h-11 px-6 rounded-sm font-medium">
                      <Play className="w-5 h-5 mr-2 fill-white" />
                      START WATCHING S1 E1
                    </Button>
                  </Link>
                  <Button variant="outline" className="border-white/50 text-white hover:bg-white/10 h-11 px-4 rounded-sm bg-transparent">
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="px-4 md:px-8 lg:px-12 pt-6 md:pt-28 pb-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Mobile Poster */}
          <div className="md:hidden w-32 mx-auto -mt-20 relative z-10">
            <div className="aspect-[2/3] rounded overflow-hidden shadow-2xl">
              <Image
                src={anime.thumbnail}
                alt={anime.title}
                width={128}
                height={192}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Sidebar - Hidden on mobile, visible on larger screens */}
          <div className="hidden md:block w-44 lg:w-52 flex-shrink-0">
            {/* This space is for the overflowing poster */}
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Synopsis */}
            <div className="mb-8">
              <p className="text-[#a0a0a0] leading-relaxed text-sm">
                {anime.synopsis}
              </p>
            </div>

            {/* Episodes Section */}
            <EpisodeGrid anime={anime} episodes={allEpisodes} />
          </div>
        </div>
      </div>
    </div>
  )
}
