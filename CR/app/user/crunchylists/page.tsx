"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Plus, MoreVertical, Globe, Lock, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { crunchylists } from "@/lib/mockData"

export default function CrunchylistsPage() {
  const [lists, setLists] = useState(crunchylists)
  const [newListName, setNewListName] = useState("")
  const [newListPublic, setNewListPublic] = useState(false)
  const [activeTab, setActiveTab] = useState<"watchlist" | "crunchylists" | "history">("crunchylists")

  const handleCreateList = () => {
    if (newListName.trim()) {
      setLists([
        ...lists,
        {
          id: `cl${Date.now()}`,
          name: newListName,
          items: [],
          isPublic: newListPublic
        }
      ])
      setNewListName("")
      setNewListPublic(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#000000]">
      {/* Header with Tabs */}
      <div className="px-4 md:px-8 lg:px-12 pt-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">My Lists</h1>
        
        {/* Tabs */}
        <div className="flex border-b border-[#23252b]">
          <Link
            href="/user/watchlist"
            className="px-4 py-3 text-sm font-medium text-[#a0a0a0] hover:text-white transition-colors relative"
          >
            WATCHLIST
          </Link>
          <button
            onClick={() => setActiveTab("crunchylists")}
            className="px-4 py-3 text-sm font-medium text-[#F47521] transition-colors relative"
          >
            CRUNCHYLISTS
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F47521]" />
          </button>
          <Link
            href="/user/watchlist?tab=history"
            className="px-4 py-3 text-sm font-medium text-[#a0a0a0] hover:text-white transition-colors relative"
          >
            HISTORY
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-8 lg:px-12 py-8">
        {/* Create New List Button */}
        <div className="mb-8">
          <Dialog>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#F47521] hover:bg-[#e06515] text-white rounded-sm font-medium text-sm transition-colors">
                <Plus className="w-4 h-4" />
                CREATE NEW LIST
              </button>
            </DialogTrigger>
            <DialogContent className="bg-[#23252b] border-[#3a3c42]">
              <DialogHeader>
                <DialogTitle className="text-white">Create New Crunchylist</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="listName" className="text-white">List Name</Label>
                  <Input
                    id="listName"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="My Awesome List"
                    className="mt-2 bg-[#141519] border-[#3a3c42] text-white placeholder:text-[#a0a0a0]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="isPublic" className="text-white">Make Public</Label>
                    <p className="text-sm text-[#a0a0a0]">Anyone can view this list</p>
                  </div>
                  <Switch
                    id="isPublic"
                    checked={newListPublic}
                    onCheckedChange={setNewListPublic}
                  />
                </div>
                <Button
                  onClick={handleCreateList}
                  className="w-full bg-[#F47521] hover:bg-[#e06515] text-white"
                >
                  Create List
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lists Grid as Folders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {lists.map((list) => (
            <div
              key={list.id}
              className="group"
            >
              {/* Folder Thumbnail */}
              <Link href={`/user/crunchylists/${list.id}`} className="block">
                <div className="aspect-video bg-[#23252b] rounded overflow-hidden relative mb-3">
                  {list.items.length > 0 ? (
                    <div className="grid grid-cols-2 h-full">
                      {list.items.slice(0, 4).map((anime, index) => (
                        <div key={anime.id} className="relative">
                          <Image
                            src={anime.thumbnail}
                            alt={anime.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                      {list.items.length < 4 && Array.from({ length: 4 - list.items.length }).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-[#2a2c32]" />
                      ))}
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-16 h-16 text-[#3a3c42] group-hover:text-[#F47521] transition-colors" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                      </svg>
                    </div>
                  )}
                </div>
              </Link>

              {/* List Info */}
              <div className="flex items-start justify-between">
                <Link href={`/user/crunchylists/${list.id}`} className="flex-1">
                  <h3 className="text-sm font-medium text-white group-hover:text-[#F47521] transition-colors">
                    {list.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {list.isPublic ? (
                      <Globe className="w-3.5 h-3.5 text-[#a0a0a0]" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-[#a0a0a0]" />
                    )}
                    <span className="text-xs text-[#a0a0a0]">
                      {list.items.length} {list.items.length === 1 ? "item" : "items"}
                    </span>
                  </div>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 text-[#a0a0a0] hover:text-white hover:bg-[#2a2c32] rounded transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#23252b] border-[#3a3c42]">
                    <DropdownMenuItem className="text-white focus:bg-[#2a2c32] focus:text-white">
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit List
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-500 hover:text-red-400 focus:text-red-400 focus:bg-[#2a2c32]">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete List
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {lists.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#23252b] flex items-center justify-center">
              <Plus className="w-8 h-8 text-[#a0a0a0]" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No Crunchylists yet</h3>
            <p className="text-[#a0a0a0] mb-6">Create your first list to start organizing your anime</p>
          </div>
        )}
      </div>
    </div>
  )
}
