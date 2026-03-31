export interface Anime {
  id: string
  title: string
  japanesTitle?: string
  synopsis: string
  thumbnail: string
  coverImage: string
  genres: string[]
  rating: number
  episodeCount: number
  releaseYear: number
  status: "ongoing" | "completed"
  subDub: ("sub" | "dub")[]
  studio: string
  nextEpisode?: {
    number: number
    releaseTime: string
  }
}

export interface Episode {
  id: string
  animeId: string
  number: number
  title: string
  thumbnail: string
  duration: string
  releaseDate: string
  synopsis: string
  subDub: "sub" | "dub"
}

export interface SimulcastEntry {
  anime: Anime
  episode: Episode
  releaseTime: string
  isNew: boolean
}

// Anime Database
export const animeList: Anime[] = [
  {
    id: "1",
    title: "Solo Leveling",
    japanesTitle: "Ore dake Level Up na Ken",
    synopsis: "In a world where hunters — humans who possess magical abilities — must battle deadly monsters to protect the human race from certain annihilation, a notoriously weak hunter named Sung Jinwoo finds himself in a seemingly endless struggle for survival.",
    thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&h=1080&fit=crop",
    genres: ["Action", "Adventure", "Fantasy"],
    rating: 4.9,
    episodeCount: 12,
    releaseYear: 2024,
    status: "ongoing",
    subDub: ["sub", "dub"],
    studio: "A-1 Pictures",
    nextEpisode: { number: 13, releaseTime: "Saturday 10:00 AM" }
  },
  {
    id: "2",
    title: "Demon Slayer: Kimetsu no Yaiba",
    japanesTitle: "Kimetsu no Yaiba",
    synopsis: "Tanjiro Kamado, joined with Inosuke Hashibira, a boy raised by boars who wears a boar's head, and Zenitsu Agatsuma, a scared boy who reveals his true power when he sleeps, boards the Infinity Train on a new mission with the Fire Hashira, Kyojuro Rengoku.",
    thumbnail: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1920&h=1080&fit=crop",
    genres: ["Action", "Supernatural", "Shonen"],
    rating: 4.8,
    episodeCount: 44,
    releaseYear: 2019,
    status: "ongoing",
    subDub: ["sub", "dub"],
    studio: "ufotable"
  },
  {
    id: "3",
    title: "Jujutsu Kaisen",
    synopsis: "Yuji Itadori is a boy with tremendous physical strength, though he lives a completely ordinary high school life. One day, to save a friend who has been attacked by Curses, he eats a finger of Ryomen Sukuna, taking the Curse into his own soul.",
    thumbnail: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=1920&h=1080&fit=crop",
    genres: ["Action", "Supernatural", "Shonen"],
    rating: 4.9,
    episodeCount: 47,
    releaseYear: 2020,
    status: "ongoing",
    subDub: ["sub", "dub"],
    studio: "MAPPA"
  },
  {
    id: "4",
    title: "My Hero Academia",
    japanesTitle: "Boku no Hero Academia",
    synopsis: "In a world where most of the population possesses superpowers called 'Quirks', Izuku Midoriya dreams of becoming a hero despite being born without powers.",
    thumbnail: "https://images.unsplash.com/photo-1601850494422-3cf14624b0b3?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1601850494422-3cf14624b0b3?w=1920&h=1080&fit=crop",
    genres: ["Action", "Comedy", "Shonen"],
    rating: 4.7,
    episodeCount: 138,
    releaseYear: 2016,
    status: "ongoing",
    subDub: ["sub", "dub"],
    studio: "Bones"
  },
  {
    id: "5",
    title: "Attack on Titan",
    japanesTitle: "Shingeki no Kyojin",
    synopsis: "After his hometown is destroyed and his mother is killed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans that have brought humanity to the brink of extinction.",
    thumbnail: "https://images.unsplash.com/photo-1541562232579-512a21360f5d?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1541562232579-512a21360f5d?w=1920&h=1080&fit=crop",
    genres: ["Action", "Drama", "Fantasy"],
    rating: 4.9,
    episodeCount: 87,
    releaseYear: 2013,
    status: "completed",
    subDub: ["sub", "dub"],
    studio: "MAPPA"
  },
  {
    id: "6",
    title: "Spy x Family",
    synopsis: "A spy on an undercover mission gets married and adopts a child as part of his cover. His wife and daughter have secrets of their own, and all three must strive to keep together.",
    thumbnail: "https://images.unsplash.com/photo-1560972550-aba3456b5564?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1560972550-aba3456b5564?w=1920&h=1080&fit=crop",
    genres: ["Action", "Comedy", "Slice of Life"],
    rating: 4.8,
    episodeCount: 37,
    releaseYear: 2022,
    status: "ongoing",
    subDub: ["sub", "dub"],
    studio: "Wit Studio"
  },
  {
    id: "7",
    title: "Chainsaw Man",
    synopsis: "Denji is a teenage boy living with a Chainsaw Devil named Pochita. Due to the debt his father left behind, he has been living a rock-bottom life while repaying his debt by harvesting devil corpses.",
    thumbnail: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=1920&h=1080&fit=crop",
    genres: ["Action", "Horror", "Supernatural"],
    rating: 4.7,
    episodeCount: 12,
    releaseYear: 2022,
    status: "ongoing",
    subDub: ["sub", "dub"],
    studio: "MAPPA"
  },
  {
    id: "8",
    title: "One Piece",
    synopsis: "Monkey D. Luffy sets off on an adventure with his pirate crew in hopes of finding the greatest treasure ever, known as the 'One Piece'.",
    thumbnail: "https://images.unsplash.com/photo-1607457561901-e6ec3a6d16cf?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1607457561901-e6ec3a6d16cf?w=1920&h=1080&fit=crop",
    genres: ["Action", "Adventure", "Comedy"],
    rating: 4.8,
    episodeCount: 1100,
    releaseYear: 1999,
    status: "ongoing",
    subDub: ["sub", "dub"],
    studio: "Toei Animation"
  },
  {
    id: "9",
    title: "Frieren: Beyond Journey's End",
    japanesTitle: "Sousou no Frieren",
    synopsis: "The adventure is over but life goes on for an elf mage just beginning to learn what living is all about. Elf mage Frieren and her courageous party just defeated the Demon King.",
    thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&h=1080&fit=crop",
    genres: ["Adventure", "Drama", "Fantasy"],
    rating: 4.9,
    episodeCount: 28,
    releaseYear: 2023,
    status: "ongoing",
    subDub: ["sub", "dub"],
    studio: "Madhouse"
  },
  {
    id: "10",
    title: "Blue Lock",
    synopsis: "After a disastrous defeat at the 2018 World Cup, Japan's team struggles to regroup. But what's missing? An absolute Ace Striker. The Football Association is convinced it's the key to victory.",
    thumbnail: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920&h=1080&fit=crop",
    genres: ["Sports", "Drama", "Shonen"],
    rating: 4.6,
    episodeCount: 24,
    releaseYear: 2022,
    status: "ongoing",
    subDub: ["sub", "dub"],
    studio: "8bit"
  },
  {
    id: "11",
    title: "Bocchi the Rock!",
    synopsis: "Hitori Gotoh is a high school girl who's starting to learn to play the guitar because she dreams of being in a band.",
    thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920&h=1080&fit=crop",
    genres: ["Comedy", "Music", "Slice of Life"],
    rating: 4.8,
    episodeCount: 12,
    releaseYear: 2022,
    status: "completed",
    subDub: ["sub", "dub"],
    studio: "CloverWorks"
  },
  {
    id: "12",
    title: "Mushoku Tensei",
    japanesTitle: "Mushoku Tensei: Isekai Ittara Honki Dasu",
    synopsis: "A 34-year-old underachiever gets run over by a bus, but his story doesn't end there. Reincarnated in a new world as an infant, Rudy will seize every opportunity to live the life he's always wanted.",
    thumbnail: "https://images.unsplash.com/photo-1519638399535-1b036603ac77?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1519638399535-1b036603ac77?w=1920&h=1080&fit=crop",
    genres: ["Adventure", "Drama", "Isekai"],
    rating: 4.7,
    episodeCount: 35,
    releaseYear: 2021,
    status: "ongoing",
    subDub: ["sub", "dub"],
    studio: "Studio Bind"
  }
]

// Episodes Database
export const episodesList: Episode[] = [
  {
    id: "e1",
    animeId: "1",
    number: 1,
    title: "I'm Used to It",
    thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=640&h=360&fit=crop",
    duration: "23:40",
    releaseDate: "2024-01-06",
    synopsis: "Sung Jinwoo is the weakest hunter in all of Korea. But a mysterious dungeon changes everything.",
    subDub: "sub"
  },
  {
    id: "e2",
    animeId: "1",
    number: 2,
    title: "If I Had One More Chance",
    thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=640&h=360&fit=crop",
    duration: "23:40",
    releaseDate: "2024-01-13",
    synopsis: "Jinwoo awakens with a strange system only he can see.",
    subDub: "sub"
  },
  {
    id: "e3",
    animeId: "1",
    number: 3,
    title: "It's Like a Game",
    thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=640&h=360&fit=crop",
    duration: "23:40",
    releaseDate: "2024-01-20",
    synopsis: "Jinwoo begins to understand the rules of his new abilities.",
    subDub: "sub"
  },
  {
    id: "e4",
    animeId: "2",
    number: 1,
    title: "Cruelty",
    thumbnail: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=640&h=360&fit=crop",
    duration: "23:40",
    releaseDate: "2019-04-06",
    synopsis: "Tanjiro lives in the mountains with his family, making a living selling charcoal.",
    subDub: "sub"
  },
  {
    id: "e5",
    animeId: "3",
    number: 1,
    title: "Ryomen Sukuna",
    thumbnail: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=640&h=360&fit=crop",
    duration: "23:40",
    releaseDate: "2020-10-03",
    synopsis: "Yuji Itadori is a high school student with incredible physical abilities.",
    subDub: "sub"
  }
]

// Simulcast Schedule
export const simulcastSchedule: SimulcastEntry[] = [
  {
    anime: animeList[0],
    episode: { ...episodesList[0], number: 13 },
    releaseTime: "10:00 AM",
    isNew: true
  },
  {
    anime: animeList[1],
    episode: { ...episodesList[3], number: 45 },
    releaseTime: "11:30 AM",
    isNew: true
  },
  {
    anime: animeList[2],
    episode: { ...episodesList[4], number: 48 },
    releaseTime: "2:00 PM",
    isNew: false
  },
  {
    anime: animeList[5],
    episode: { ...episodesList[0], number: 38, title: "Operation Strix" },
    releaseTime: "4:30 PM",
    isNew: true
  },
  {
    anime: animeList[8],
    episode: { ...episodesList[0], number: 29, title: "The Journey Continues" },
    releaseTime: "6:00 PM",
    isNew: true
  }
]

// Categories/Rows for Dashboard - Matching Crunchyroll style
export const dashboardRows = [
  { title: "Continue Watching", anime: animeList.slice(0, 6) },
  { title: "Popular This Season", anime: animeList.slice(2, 10) },
  { title: "New Episodes", anime: animeList.slice(4, 12) },
  { title: "Top Rated", anime: [...animeList].sort((a, b) => b.rating - a.rating).slice(0, 8) },
  { title: "Action Anime", anime: animeList.filter(a => a.genres.includes("Action")) },
  { title: "Recently Added", anime: [...animeList].reverse().slice(0, 8) }
]

// Trending Anime in UAE - specific row
export const trendingAnime: Anime[] = [
  {
    id: "one-piece",
    title: "One Piece",
    synopsis: "Monkey D. Luffy sets off on an adventure with his pirate crew in hopes of finding the greatest treasure ever, known as the 'One Piece'.",
    thumbnail: "https://images.unsplash.com/photo-1607457561901-e6ec3a6d16cf?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1607457561901-e6ec3a6d16cf?w=1920&h=1080&fit=crop",
    genres: ["Action", "Adventure", "Comedy"],
    rating: 4.8,
    episodeCount: 1100,
    releaseYear: 1999,
    status: "ongoing",
    subDub: ["sub"],
    studio: "Toei Animation"
  },
  {
    id: "jjk",
    title: "JUJUTSU KAISEN",
    synopsis: "Yuji Itadori is a boy with tremendous physical strength who joins a secret organization of Jujutsu Sorcerers.",
    thumbnail: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=1920&h=1080&fit=crop",
    genres: ["Action", "Supernatural", "Shonen"],
    rating: 4.9,
    episodeCount: 47,
    releaseYear: 2020,
    status: "ongoing",
    subDub: ["sub", "dub"],
    studio: "MAPPA"
  },
  {
    id: "hells-paradise",
    title: "Hell's Paradise",
    synopsis: "Gabimaru the Hollow, a ninja condemned to death, is offered a chance at freedom if he can find the elixir of immortality.",
    thumbnail: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=1920&h=1080&fit=crop",
    genres: ["Action", "Adventure", "Supernatural"],
    rating: 4.7,
    episodeCount: 13,
    releaseYear: 2023,
    status: "ongoing",
    subDub: ["sub", "dub"],
    studio: "MAPPA"
  },
  {
    id: "slime",
    title: "That Time I Got Reincarnated as a Slime",
    synopsis: "A 37-year-old corporate worker is stabbed by a random assailant and reincarnated in a fantasy world as a slime monster.",
    thumbnail: "https://images.unsplash.com/photo-1560972550-aba3456b5564?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1560972550-aba3456b5564?w=1920&h=1080&fit=crop",
    genres: ["Action", "Adventure", "Isekai"],
    rating: 4.6,
    episodeCount: 48,
    releaseYear: 2018,
    status: "ongoing",
    subDub: ["sub", "dub"],
    studio: "8bit"
  },
  {
    id: "fire-force",
    title: "Fire Force",
    synopsis: "In Year 198 of the Solar Era, special fire brigades are fighting against a phenomenon called spontaneous human combustion.",
    thumbnail: "https://images.unsplash.com/photo-1541562232579-512a21360f5d?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1541562232579-512a21360f5d?w=1920&h=1080&fit=crop",
    genres: ["Action", "Supernatural", "Shonen"],
    rating: 4.5,
    episodeCount: 48,
    releaseYear: 2019,
    status: "completed",
    subDub: ["sub", "dub"],
    studio: "David Production"
  },
  {
    id: "aot",
    title: "Attack on Titan",
    synopsis: "After his hometown is destroyed and his mother is killed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans.",
    thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&h=1080&fit=crop",
    genres: ["Action", "Drama", "Fantasy"],
    rating: 4.9,
    episodeCount: 87,
    releaseYear: 2013,
    status: "completed",
    subDub: ["sub", "dub"],
    studio: "MAPPA"
  },
  {
    id: "demon-slayer",
    title: "Demon Slayer",
    synopsis: "Tanjiro Kamado, a boy raised in the mountains, makes a living selling charcoal. One day, his entire family is slaughtered by a demon.",
    thumbnail: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1920&h=1080&fit=crop",
    genres: ["Action", "Supernatural", "Shonen"],
    rating: 4.8,
    episodeCount: 44,
    releaseYear: 2019,
    status: "ongoing",
    subDub: ["sub", "dub"],
    studio: "ufotable"
  },
  {
    id: "mha",
    title: "My Hero Academia",
    synopsis: "In a world where most of the population possesses superpowers, Izuku Midoriya dreams of becoming a hero.",
    thumbnail: "https://images.unsplash.com/photo-1601850494422-3cf14624b0b3?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1601850494422-3cf14624b0b3?w=1920&h=1080&fit=crop",
    genres: ["Action", "Comedy", "Shonen"],
    rating: 4.7,
    episodeCount: 138,
    releaseYear: 2016,
    status: "ongoing",
    subDub: ["sub", "dub"],
    studio: "Bones"
  }
]

// Top Picks for You
export const topPicks: Anime[] = [
  {
    id: "solo-leveling",
    title: "Solo Leveling",
    synopsis: "In a world where hunters must battle deadly monsters, a weak hunter named Sung Jinwoo finds himself in a struggle for survival.",
    thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&h=1080&fit=crop",
    genres: ["Action", "Adventure", "Fantasy"],
    rating: 4.9,
    episodeCount: 12,
    releaseYear: 2024,
    status: "ongoing",
    subDub: ["sub", "dub"],
    studio: "A-1 Pictures"
  },
  {
    id: "clevatess",
    title: "Clevatess",
    synopsis: "In a fantasy world where magic and technology collide, a young warrior must uncover the secrets of the ancient Clevatess.",
    thumbnail: "https://images.unsplash.com/photo-1519638399535-1b036603ac77?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1519638399535-1b036603ac77?w=1920&h=1080&fit=crop",
    genres: ["Action", "Fantasy", "Adventure"],
    rating: 4.3,
    episodeCount: 12,
    releaseYear: 2024,
    status: "ongoing",
    subDub: ["sub", "dub"],
    studio: "MAPPA"
  },
  {
    id: "jack-trades",
    title: "Jack of All Trades",
    synopsis: "A skilled adventurer who can do anything but master nothing embarks on a journey across kingdoms.",
    thumbnail: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920&h=1080&fit=crop",
    genres: ["Adventure", "Comedy", "Fantasy"],
    rating: 4.1,
    episodeCount: 12,
    releaseYear: 2024,
    status: "ongoing",
    subDub: ["sub"],
    studio: "Studio Deen"
  },
  {
    id: "apothecary",
    title: "The Apothecary Diaries",
    synopsis: "A young woman with pharmaceutical knowledge is sold as a servant to the imperial palace.",
    thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920&h=1080&fit=crop",
    genres: ["Drama", "Mystery", "Historical"],
    rating: 4.8,
    episodeCount: 24,
    releaseYear: 2023,
    status: "ongoing",
    subDub: ["sub", "dub"],
    studio: "TOHO Animation"
  },
  {
    id: "frieren",
    title: "Frieren: Beyond Journey's End",
    synopsis: "The adventure is over but life goes on for an elf mage just beginning to learn what living is all about.",
    thumbnail: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=1920&h=1080&fit=crop",
    genres: ["Adventure", "Drama", "Fantasy"],
    rating: 4.9,
    episodeCount: 28,
    releaseYear: 2023,
    status: "ongoing",
    subDub: ["sub", "dub"],
    studio: "Madhouse"
  },
  {
    id: "spy-family",
    title: "Spy x Family",
    synopsis: "A spy on an undercover mission gets married and adopts a child as part of his cover.",
    thumbnail: "https://images.unsplash.com/photo-1560972550-aba3456b5564?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1560972550-aba3456b5564?w=1920&h=1080&fit=crop",
    genres: ["Action", "Comedy", "Slice of Life"],
    rating: 4.8,
    episodeCount: 37,
    releaseYear: 2022,
    status: "ongoing",
    subDub: ["sub", "dub"],
    studio: "Wit Studio"
  },
  {
    id: "chainsaw",
    title: "Chainsaw Man",
    synopsis: "Denji is a teenage boy living with a Chainsaw Devil named Pochita, living a rock-bottom life.",
    thumbnail: "https://images.unsplash.com/photo-1541562232579-512a21360f5d?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1541562232579-512a21360f5d?w=1920&h=1080&fit=crop",
    genres: ["Action", "Horror", "Supernatural"],
    rating: 4.7,
    episodeCount: 12,
    releaseYear: 2022,
    status: "ongoing",
    subDub: ["sub", "dub"],
    studio: "MAPPA"
  },
  {
    id: "blue-lock",
    title: "Blue Lock",
    synopsis: "After a disastrous defeat at the 2018 World Cup, Japan searches for an absolute Ace Striker.",
    thumbnail: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=600&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920&h=1080&fit=crop",
    genres: ["Sports", "Drama", "Shonen"],
    rating: 4.6,
    episodeCount: 24,
    releaseYear: 2022,
    status: "ongoing",
    subDub: ["sub", "dub"],
    studio: "8bit"
  }
]

// Continue Watching
export const continueWatching: Anime[] = animeList.slice(0, 6)

// New Episodes
export const newEpisodes: Anime[] = animeList.slice(3, 11)

// Watchlist Items
export const watchlistItems = animeList.slice(0, 8)

// Crunchylists
export const crunchylists = [
  { id: "cl1", name: "My Favorites", items: animeList.slice(0, 5), isPublic: false },
  { id: "cl2", name: "Watch Later", items: animeList.slice(3, 9), isPublic: true },
  { id: "cl3", name: "Best Action Shows", items: animeList.filter(a => a.genres.includes("Action")).slice(0, 6), isPublic: true }
]

// Recent Searches
export const recentSearches = [
  "Solo Leveling",
  "Demon Slayer",
  "Jujutsu Kaisen",
  "Attack on Titan",
  "One Piece"
]

// Filter Options
export const filterOptions = {
  genres: [
    "Action", "Adventure", "Comedy", "Drama", "Fantasy",
    "Horror", "Isekai", "Music", "Mystery", "Romance",
    "Sci-Fi", "Seinen", "Shojo", "Shonen", "Slice of Life",
    "Sports", "Supernatural", "Thriller"
  ],
  seasons: ["Winter 2024", "Fall 2023", "Summer 2023", "Spring 2023"],
  sortBy: ["Popularity", "Newest", "Alphabetical", "Rating"],
  subDub: ["Subtitled", "Dubbed"]
}
