"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import {
  Search,
  Download,
  ChevronDown,
  Settings,
  History,
  LogOut,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useDownloadStore } from "@/stores/download-store"
import { useLanguage, ContentLanguage } from "@/lib/language-context"

const genres = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy",
  "Music", "Romance", "Sci-Fi", "Seinen", "Shojo",
  "Shonen", "Slice of Life", "Sports", "Supernatural", "Thriller",
]

export default function Header() {
  const pathname = usePathname()
  const { language, setLanguage, isAnime } = useLanguage()

  const navLinks = isAnime
    ? [
        { href: "/", label: "Home" },
        { href: "/anime", label: "Library" },
        { href: "/discover", label: "Discover" },
      ]
    : [
        { href: "/", label: "Home" },
        { href: "/movies", label: "Movies" },
        { href: "/discover", label: "Downloads" },
      ]
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [downloadsOpen, setDownloadsOpen] = useState(false)
  const categoriesRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const downloadsRef = useRef<HTMLDivElement>(null)
  const downloadStore = useDownloadStore()

  // Initialize download store globally on Header mount
  useEffect(() => {
    downloadStore.initialize()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const queueEntries = Object.entries(downloadStore.queue)
  const activeCount = queueEntries.filter(([, j]) => j.status !== 'complete').length

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoriesRef.current && !categoriesRef.current.contains(event.target as Node)) {
        setCategoriesOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
      if (downloadsRef.current && !downloadsRef.current.contains(event.target as Node)) {
        setDownloadsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-50 bg-[#141519]">
      <div className="flex items-center justify-between h-14 px-4 max-w-[1920px] mx-auto">
        {/* Left Side */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-[#F47521] font-bold text-xl tracking-widest select-none">
              BABYLON
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label }) => {
              const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? "text-[#F47521]" : "text-white hover:text-[#F47521]"
                  }`}
                >
                  {label}
                </Link>
              )
            })}

            {/* Categories Dropdown */}
            <div className="relative" ref={categoriesRef}>
              <button
                onClick={() => setCategoriesOpen(!categoriesOpen)}
                className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors ${
                  categoriesOpen ? "text-[#F47521]" : "text-white hover:text-[#F47521]"
                }`}
              >
                Categories
                <ChevronDown className={`w-4 h-4 transition-transform ${categoriesOpen ? "rotate-180" : ""}`} />
              </button>

              {categoriesOpen && (
                <div className="absolute top-full left-0 mt-0 w-[600px] bg-[#23252b] shadow-xl py-4">
                  <div className="flex">
                    {/* Left Column - Links */}
                    <div className="flex flex-col min-w-[200px] pr-4 border-r border-[#3a3c42]">
                      <Link
                        href="/anime"
                        className="px-4 py-2 text-sm text-white hover:text-[#F47521] transition-colors"
                        onClick={() => setCategoriesOpen(false)}
                      >
                        Browse All (A-Z)
                      </Link>
                      <Link
                        href="/discover"
                        className="px-4 py-2 text-sm text-white hover:text-[#F47521] transition-colors"
                        onClick={() => setCategoriesOpen(false)}
                      >
                        Discover New
                      </Link>
                    </div>

                    {/* Right Section - Genres Grid */}
                    <div className="flex-1 pl-6">
                      <h3 className="text-xs font-medium text-[#a0a0a0] uppercase tracking-wider mb-3 px-2">
                        GENRES
                      </h3>
                      <div className="grid grid-cols-3 gap-x-4">
                        {genres.map((genre) => (
                          <Link
                            key={genre}
                            href={`/discover?genre=${genre.toLowerCase().replace(/ /g, "-")}`}
                            className="px-2 py-1.5 text-sm text-white hover:text-[#F47521] transition-colors"
                            onClick={() => setCategoriesOpen(false)}
                          >
                            {genre}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-1">
          {/* Search */}
          <Link
            href="/search"
            className="p-2.5 text-white hover:text-[#F47521] transition-colors"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </Link>

          {/* Downloads Dropdown */}
          <div className="relative" ref={downloadsRef}>
            <button
              onClick={() => setDownloadsOpen(!downloadsOpen)}
              className="relative p-2.5 text-white hover:text-[#F47521] transition-colors"
              aria-label="Downloads"
            >
              <Download className="w-5 h-5" />
              {activeCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#F47521] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>

            {downloadsOpen && (
              <div className="absolute top-full right-0 mt-1 w-80 bg-[#23252b] shadow-xl overflow-hidden rounded-md max-h-[400px] overflow-y-auto">
                <div className="px-4 py-3 border-b border-[#3a3c42] flex items-center justify-between">
                  <span className="text-sm font-medium text-white">Downloads</span>
                  {activeCount > 0 && (
                    <span className="bg-[#F47521] text-white text-[10px] font-bold rounded-full px-2 py-0.5">
                      {activeCount} active
                    </span>
                  )}
                </div>
                {queueEntries.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[#a0a0a0] text-sm">
                    No downloads yet
                  </div>
                ) : (
                  <div className="divide-y divide-[#1a1a2e]">
                    {queueEntries.map(([jobId, job]) => {
                      const pct = job.total > 0 ? Math.round((job.progress / job.total) * 100) : 0
                      return (
                        <div key={jobId} className="px-4 py-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-white text-sm font-medium line-clamp-1">{job.title}</p>
                            <span className={`text-[10px] shrink-0 ml-2 ${job.status === 'complete' ? 'text-green-400' : 'text-[#F47521]'}`}>
                              {job.status === 'complete' ? 'DONE' : 'ACTIVE'}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[#141519] rounded-full overflow-hidden mb-1">
                            <div
                              className={`h-full rounded-full transition-all ${job.status === 'complete' ? 'bg-green-500' : 'bg-[#F47521]'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px] text-[#a0a0a0]">
                            <span>{job.current ? `Ep ${job.current}` : ''}</span>
                            <span>{job.progress}/{job.total}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div className="border-t border-[#3a3c42] px-4 py-2">
                  <Link
                    href="/discover"
                    className="text-[#F47521] text-xs hover:underline"
                    onClick={() => setDownloadsOpen(false)}
                  >
                    Go to Discover →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-1 p-1.5 rounded hover:bg-[#23252b] transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src="/avatar.png" alt="User" />
                <AvatarFallback className="bg-[#2a2c32] text-white text-xs">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#a0a0a0]" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </AvatarFallback>
              </Avatar>
              <ChevronDown className={`w-4 h-4 text-white transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {userMenuOpen && (
              <div className="absolute top-full right-0 mt-1 w-64 bg-[#23252b] shadow-xl overflow-hidden rounded-md">
                {/* User Info Header */}
                <div className="p-4 flex items-center gap-3 border-b border-[#3a3c42]">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="/avatar.png" alt="User" />
                    <AvatarFallback className="bg-[#2a2c32] text-white">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#a0a0a0]" fill="currentColor">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Babylon User</p>
                  </div>
                </div>

                {/* Language / Region selector */}
                <div className="px-3 py-2 border-b border-[#2a2c32]">
                  <p className="text-xs text-[#6b6b6b] mb-2">Content Region</p>
                  {[
                    { value: 'japanese', label: 'Japanese (Anime)', flag: 'JP' },
                    { value: 'tamil', label: 'Tamil', flag: 'IN' },
                    { value: 'telugu', label: 'Telugu', flag: 'IN' },
                    { value: 'kannada', label: 'Kannada', flag: 'IN' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => { setLanguage(option.value as ContentLanguage); setUserMenuOpen(false); }}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm ${
                        language === option.value ? 'text-[#F47521] bg-[#23252b]' : 'text-[#a0a0a0] hover:text-white hover:bg-[#1a1a1a]'
                      }`}
                    >
                      {option.flag === 'JP' ? '\uD83C\uDDEF\uD83C\uDDF5' : '\uD83C\uDDEE\uD83C\uDDF3'} {option.label}
                    </button>
                  ))}
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <Link
                    href="/history"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-[#2a2c32] transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <History className="w-5 h-5 text-[#a0a0a0]" />
                    Watch History
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-[#2a2c32] transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings className="w-5 h-5 text-[#a0a0a0]" />
                    Settings
                  </Link>
                </div>

                {/* Logout */}
                <div className="py-1 border-t border-[#3a3c42]">
                  <button
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white hover:bg-[#2a2c32] transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <LogOut className="w-5 h-5 text-[#a0a0a0]" />
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-white hover:text-[#F47521] transition-colors"
            aria-label="Menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#2a2c32] bg-[#141519]">
          <ul className="px-4 py-2">
            {navLinks.map(({ href, label }) => {
              const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`block py-3 text-sm font-medium border-b border-[#23252b] last:border-0 ${
                      isActive ? "text-[#F47521]" : "text-[#a0a0a0]"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {label}
                  </Link>
                </li>
              )
            })}
            <li>
              <Link
                href="/search"
                className="block py-3 text-sm font-medium text-[#a0a0a0] border-b border-[#23252b]"
                onClick={() => setMobileMenuOpen(false)}
              >
                Search
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  )
}
