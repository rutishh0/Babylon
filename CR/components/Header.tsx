"use client"

import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import {
  Search,
  Bookmark,
  ChevronDown,
  Settings,
  ListVideo,
  History,
  Bell,
  Gift,
  LogOut,
  Crown,
  Users,
  Calendar,
  Music,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const genres = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy",
  "Music", "Romance", "Sci-Fi", "Seinen", "Shojo",
  "Shonen", "Slice of life", "Sports", "Supernatural", "Thriller"
]

export function Header() {
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const categoriesRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoriesRef.current && !categoriesRef.current.contains(event.target as Node)) {
        setCategoriesOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
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
          <Link href="/dashboard" className="flex items-center gap-2">
            <svg viewBox="0 0 48 48" className="h-7 w-7 text-[#F47521]" fill="currentColor">
              <path d="M24 2C11.85 2 2 11.85 2 24s9.85 22 22 22 22-9.85 22-22S36.15 2 24 2zm0 38c-8.82 0-16-7.18-16-16S15.18 8 24 8s16 7.18 16 16-7.18 16-16 16zm-4-22a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>
            </svg>
            <span className="text-[#F47521] font-semibold text-lg hidden sm:inline">Crunchyroll</span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/new"
              className="px-3 py-2 text-sm font-medium text-white hover:text-[#F47521] transition-colors"
            >
              New
            </Link>
            <Link
              href="/popular"
              className="px-3 py-2 text-sm font-medium text-white hover:text-[#F47521] transition-colors"
            >
              Popular
            </Link>
            <Link
              href="/simulcast"
              className="px-3 py-2 text-sm font-medium text-white hover:text-[#F47521] transition-colors"
            >
              Simulcast
            </Link>

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
                        href="/discover"
                        className="px-4 py-2 text-sm text-white hover:text-[#F47521] transition-colors"
                        onClick={() => setCategoriesOpen(false)}
                      >
                        Browse All (A-Z)
                      </Link>
                      <Link
                        href="/simulcast"
                        className="px-4 py-2 text-sm text-white hover:text-[#F47521] transition-colors"
                        onClick={() => setCategoriesOpen(false)}
                      >
                        Release Calendar
                      </Link>
                      <Link
                        href="/discover?genre=music"
                        className="px-4 py-2 text-sm text-white hover:text-[#F47521] transition-colors"
                        onClick={() => setCategoriesOpen(false)}
                      >
                        Music Videos & Concerts
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
                            href={`/discover?genre=${genre.toLowerCase()}`}
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

          {/* Bookmark */}
          <Link
            href="/user/watchlist"
            className="p-2.5 text-white hover:text-[#F47521] transition-colors"
            aria-label="Watchlist"
          >
            <Bookmark className="w-5 h-5" />
          </Link>

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
              <div className="absolute top-full right-0 mt-1 w-72 bg-[#23252b] shadow-xl overflow-hidden">
                {/* User Info Header */}
                <div className="p-4 flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="/avatar.png" alt="User" />
                    <AvatarFallback className="bg-[#2a2c32] text-white">
                      <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#a0a0a0]" fill="currentColor">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-base font-medium text-white">Rutishkrishna</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Crown className="w-3.5 h-3.5 text-[#FFD700]" />
                      <span className="text-sm font-medium text-[#FFD700]">Premium Member</span>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-[#2a2c32] rounded transition-colors">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#a0a0a0]" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <Link
                    href="/user/profile"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-[#2a2c32] transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Users className="w-5 h-5 text-[#a0a0a0]" />
                    Switch Profile
                  </Link>
                  <Link
                    href="/user/settings"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-[#2a2c32] transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings className="w-5 h-5 text-[#a0a0a0]" />
                    Settings
                  </Link>
                  <Link
                    href="/user/watchlist"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-[#2a2c32] transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Bookmark className="w-5 h-5 text-[#a0a0a0]" />
                    Watchlist
                  </Link>
                  <Link
                    href="/user/crunchylists"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-[#2a2c32] transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <ListVideo className="w-5 h-5 text-[#a0a0a0]" />
                    Crunchylists
                  </Link>
                  <Link
                    href="/user/history"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-[#2a2c32] transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <History className="w-5 h-5 text-[#a0a0a0]" />
                    History
                  </Link>
                  <Link
                    href="/user/notifications"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-[#2a2c32] transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Bell className="w-5 h-5 text-[#a0a0a0]" />
                    Notifications
                  </Link>
                  <Link
                    href="/user/gift-card"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-[#2a2c32] transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Gift className="w-5 h-5 text-[#a0a0a0]" />
                    <div>
                      <span>Gift Card</span>
                      <p className="text-xs text-[#a0a0a0]">Have a gift card? Redeem it here.</p>
                    </div>
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
        </div>
      </div>
    </header>
  )
}
