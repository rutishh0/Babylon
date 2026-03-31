import Image from "next/image"
import Link from "next/link"
import type { Anime } from "@/lib/mockData"

interface AnimeCardProps {
  anime: Anime
  showRating?: boolean
  variant?: "carousel" | "grid"
}

export function AnimeCard({ anime, showRating = false, variant = "carousel" }: AnimeCardProps) {
  // Format sub/dub display
  const getSubDubText = () => {
    if (anime.subDub.length === 0) return ""
    if (anime.subDub.includes("sub") && anime.subDub.includes("dub")) {
      return "Sub | Dub"
    }
    if (anime.subDub.includes("sub")) return "Subtitled"
    if (anime.subDub.includes("dub")) return "Dubbed"
    return ""
  }

  const widthClass = variant === "carousel" 
    ? "w-[180px] md:w-[200px] lg:w-[220px]" 
    : "w-full"

  return (
    <Link
      href={`/anime/${anime.id}`}
      className={`flex-shrink-0 ${widthClass} group`}
    >
      {/* Thumbnail - Tall Portrait */}
      <div className="relative aspect-[2/3] rounded overflow-hidden bg-[#23252b] mb-2">
        <Image
          src={anime.thumbnail}
          alt={anime.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 180px, (max-width: 1024px) 200px, 220px"
        />
        
        {/* Hover overlay with slight darkening */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
      </div>

      {/* Title - Bold, crisp, white */}
      <h3 className="text-white font-semibold text-sm md:text-base leading-tight line-clamp-2 mb-1 group-hover:text-[#F47521] transition-colors">
        {anime.title}
      </h3>

      {/* Sub/Dub text - Smaller, gray, muted */}
      <p className="text-[#a0a0a0] text-xs md:text-sm">
        {getSubDubText()}
      </p>
    </Link>
  )
}
