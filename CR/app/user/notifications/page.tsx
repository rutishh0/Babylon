"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Bell, Check, Trash2, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { animeList } from "@/lib/mockData"

// Mock notifications
const notifications = [
  {
    id: 1,
    type: "new_episode",
    anime: animeList[0],
    episode: 24,
    message: "New episode available!",
    time: "2 hours ago",
    read: false
  },
  {
    id: 2,
    type: "new_episode",
    anime: animeList[1],
    episode: 12,
    message: "New episode available!",
    time: "5 hours ago",
    read: false
  },
  {
    id: 3,
    type: "simulcast",
    anime: animeList[2],
    episode: 8,
    message: "Simulcast premiere today at 10:00 AM",
    time: "Yesterday",
    read: true
  },
  {
    id: 4,
    type: "recommendation",
    anime: animeList[3],
    message: "Recommended for you based on your watchlist",
    time: "2 days ago",
    read: true
  },
  {
    id: 5,
    type: "new_season",
    anime: animeList[4],
    message: "Season 2 is now available!",
    time: "3 days ago",
    read: true
  },
]

export default function NotificationsPage() {
  const [notificationList, setNotificationList] = useState(notifications)
  const unreadCount = notificationList.filter(n => !n.read).length

  const markAsRead = (id: number) => {
    setNotificationList(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const markAllAsRead = () => {
    setNotificationList(prev => prev.map(n => ({ ...n, read: true })))
  }

  const deleteNotification = (id: number) => {
    setNotificationList(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="min-h-screen bg-[#000000]">
      <div className="max-w-[800px] mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-white" />
            <h1 className="text-2xl md:text-3xl font-bold text-white">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-[#F47521] text-white text-xs font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                onClick={markAllAsRead}
                className="text-sm text-[#F47521] hover:text-[#F47521] hover:bg-transparent"
              >
                Mark all as read
              </Button>
            )}
            <Link href="/user/settings">
              <Button variant="ghost" className="p-2 text-[#a0a0a0] hover:text-white hover:bg-transparent">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-2">
          {notificationList.length > 0 ? (
            notificationList.map((notification) => (
              <div
                key={notification.id}
                className={`relative flex gap-4 p-4 rounded-lg transition-colors ${
                  notification.read ? "bg-[#141519]" : "bg-[#1a1d24] border-l-2 border-[#F47521]"
                }`}
              >
                {/* Anime Thumbnail */}
                <Link href={`/anime/${notification.anime.id}`} className="flex-shrink-0">
                  <div className="relative w-16 h-16 rounded overflow-hidden">
                    <Image
                      src={notification.anime.thumbnail}
                      alt={notification.anime.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                </Link>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <Link href={`/anime/${notification.anime.id}`}>
                    <h3 className="text-white font-medium hover:text-[#F47521] transition-colors">
                      {notification.anime.title}
                    </h3>
                  </Link>
                  <p className="text-sm text-[#a0a0a0] mt-0.5">
                    {notification.episode && `Episode ${notification.episode} - `}
                    {notification.message}
                  </p>
                  <p className="text-xs text-[#6a6c72] mt-1">{notification.time}</p>
                </div>

                {/* Actions */}
                <div className="flex items-start gap-1">
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-2 text-[#a0a0a0] hover:text-[#22c55e] transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 text-[#a0a0a0] hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16">
              <Bell className="w-12 h-12 text-[#3a3c42] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No notifications</h3>
              <p className="text-sm text-[#a0a0a0]">
                You&apos;re all caught up! Check back later for updates.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
