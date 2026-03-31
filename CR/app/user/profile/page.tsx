"use client"

import { useState } from "react"
import { Crown, Edit2, Camera, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const avatarOptions = [
  { id: 1, name: "Default", color: "#F47521" },
  { id: 2, name: "Blue", color: "#00a8e1" },
  { id: 3, name: "Green", color: "#22c55e" },
  { id: 4, name: "Purple", color: "#a855f7" },
  { id: 5, name: "Red", color: "#ef4444" },
  { id: 6, name: "Yellow", color: "#eab308" },
]

export default function ProfilePage() {
  const [selectedAvatar, setSelectedAvatar] = useState(1)
  const [isEditing, setIsEditing] = useState(false)
  const [username, setUsername] = useState("Rutishkrishna")

  return (
    <div className="min-h-screen bg-[#000000]">
      <div className="max-w-[800px] mx-auto px-4 py-8">
        {/* Page Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-white text-center mb-8">
          Profile Settings
        </h1>

        {/* Profile Card */}
        <div className="bg-[#141519] rounded-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-24 w-24 md:h-32 md:w-32">
                <AvatarImage src="/avatar.png" alt="User" />
                <AvatarFallback 
                  className="text-white text-2xl font-bold"
                  style={{ backgroundColor: avatarOptions.find(a => a.id === selectedAvatar)?.color }}
                >
                  {username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 p-2 bg-[#F47521] rounded-full hover:bg-[#e06a1e] transition-colors">
                <Camera className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                {isEditing ? (
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-[#23252b] text-white text-xl font-bold px-3 py-1 rounded border border-[#3a3c42] focus:border-[#F47521] outline-none"
                  />
                ) : (
                  <h2 className="text-xl font-bold text-white">{username}</h2>
                )}
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className="p-1 hover:bg-[#23252b] rounded transition-colors"
                >
                  {isEditing ? (
                    <Check className="w-4 h-4 text-[#22c55e]" />
                  ) : (
                    <Edit2 className="w-4 h-4 text-[#a0a0a0]" />
                  )}
                </button>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-1">
                <Crown className="w-4 h-4 text-[#FFD700]" />
                <span className="text-sm font-medium text-[#FFD700]">Premium Member</span>
              </div>
              <p className="text-sm text-[#a0a0a0] mt-2">Member since January 2024</p>
            </div>
          </div>
        </div>

        {/* Avatar Selection */}
        <div className="bg-[#141519] rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-4">Choose Avatar Color</h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {avatarOptions.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => setSelectedAvatar(avatar.id)}
                className={`relative aspect-square rounded-lg flex items-center justify-center text-white text-2xl font-bold transition-all ${
                  selectedAvatar === avatar.id ? "ring-2 ring-[#F47521] ring-offset-2 ring-offset-[#141519]" : ""
                }`}
                style={{ backgroundColor: avatar.color }}
              >
                {username.charAt(0).toUpperCase()}
                {selectedAvatar === avatar.id && (
                  <div className="absolute bottom-1 right-1 p-0.5 bg-[#F47521] rounded-full">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Profile Stats */}
        <div className="bg-[#141519] rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-4">Viewing Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-[#23252b] rounded-lg">
              <p className="text-2xl font-bold text-[#F47521]">127</p>
              <p className="text-sm text-[#a0a0a0]">Episodes Watched</p>
            </div>
            <div className="text-center p-4 bg-[#23252b] rounded-lg">
              <p className="text-2xl font-bold text-[#F47521]">15</p>
              <p className="text-sm text-[#a0a0a0]">Series Completed</p>
            </div>
            <div className="text-center p-4 bg-[#23252b] rounded-lg">
              <p className="text-2xl font-bold text-[#F47521]">48h</p>
              <p className="text-sm text-[#a0a0a0]">Watch Time</p>
            </div>
            <div className="text-center p-4 bg-[#23252b] rounded-lg">
              <p className="text-2xl font-bold text-[#F47521]">23</p>
              <p className="text-sm text-[#a0a0a0]">In Watchlist</p>
            </div>
          </div>
        </div>

        {/* Manage Profiles */}
        <div className="bg-[#141519] rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Manage Profiles</h3>
          <p className="text-sm text-[#a0a0a0] mb-4">
            You can create up to 5 profiles on your account.
          </p>
          <div className="flex flex-wrap gap-4">
            {/* Current Profile */}
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-16 w-16 ring-2 ring-[#F47521]">
                <AvatarFallback 
                  className="text-white text-xl font-bold"
                  style={{ backgroundColor: avatarOptions.find(a => a.id === selectedAvatar)?.color }}
                >
                  {username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-white">{username}</span>
            </div>

            {/* Add Profile Button */}
            <div className="flex flex-col items-center gap-2">
              <button className="h-16 w-16 rounded-full border-2 border-dashed border-[#3a3c42] flex items-center justify-center hover:border-[#F47521] transition-colors">
                <span className="text-2xl text-[#a0a0a0]">+</span>
              </button>
              <span className="text-sm text-[#a0a0a0]">Add Profile</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
