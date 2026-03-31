"use client"

import { useState } from "react"
import { ChevronRight, Globe, Volume2, Subtitles, Bell, Shield, CreditCard, Crown } from "lucide-react"
import { Switch } from "@/components/ui/switch"

export default function SettingsPage() {
  const [autoplay, setAutoplay] = useState(true)
  const [autoNext, setAutoNext] = useState(true)
  const [notifications, setNotifications] = useState(true)
  const [emailUpdates, setEmailUpdates] = useState(false)
  const [matureContent, setMatureContent] = useState(true)

  return (
    <div className="min-h-screen bg-[#000000]">
      <div className="max-w-[800px] mx-auto px-4 py-8">
        {/* Page Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-white text-center mb-8">
          Settings
        </h1>

        {/* Subscription Section */}
        <div className="bg-[#141519] rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Crown className="w-5 h-5 text-[#FFD700]" />
            <h3 className="text-lg font-bold text-white">Subscription</h3>
          </div>
          <div className="flex items-center justify-between p-4 bg-[#23252b] rounded-lg">
            <div>
              <p className="text-white font-medium">Premium Mega Fan</p>
              <p className="text-sm text-[#a0a0a0]">Billed monthly</p>
            </div>
            <div className="text-right">
              <p className="text-[#FFD700] font-bold">$9.99/mo</p>
              <p className="text-xs text-[#a0a0a0]">Next billing: Apr 15, 2026</p>
            </div>
          </div>
          <button className="mt-4 text-sm text-[#F47521] hover:underline">
            Manage Subscription
          </button>
        </div>

        {/* Playback Settings */}
        <div className="bg-[#141519] rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Volume2 className="w-5 h-5 text-[#a0a0a0]" />
            <h3 className="text-lg font-bold text-white">Playback</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-[#2a2c32]">
              <div>
                <p className="text-white">Autoplay</p>
                <p className="text-sm text-[#a0a0a0]">Automatically play videos</p>
              </div>
              <Switch checked={autoplay} onCheckedChange={setAutoplay} />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-[#2a2c32]">
              <div>
                <p className="text-white">Auto-Next Episode</p>
                <p className="text-sm text-[#a0a0a0]">Play next episode automatically</p>
              </div>
              <Switch checked={autoNext} onCheckedChange={setAutoNext} />
            </div>

            <button className="flex items-center justify-between w-full py-3">
              <div className="text-left">
                <p className="text-white">Video Quality</p>
                <p className="text-sm text-[#a0a0a0]">Auto (recommended)</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[#a0a0a0]" />
            </button>
          </div>
        </div>

        {/* Language Settings */}
        <div className="bg-[#141519] rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-[#a0a0a0]" />
            <h3 className="text-lg font-bold text-white">Language</h3>
          </div>
          
          <div className="space-y-4">
            <button className="flex items-center justify-between w-full py-3 border-b border-[#2a2c32]">
              <div className="text-left">
                <p className="text-white">Preferred Audio Language</p>
                <p className="text-sm text-[#a0a0a0]">Japanese</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[#a0a0a0]" />
            </button>

            <button className="flex items-center justify-between w-full py-3">
              <div className="text-left">
                <p className="text-white">Site Language</p>
                <p className="text-sm text-[#a0a0a0]">English (US)</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[#a0a0a0]" />
            </button>
          </div>
        </div>

        {/* Subtitle Settings */}
        <div className="bg-[#141519] rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Subtitles className="w-5 h-5 text-[#a0a0a0]" />
            <h3 className="text-lg font-bold text-white">Subtitles</h3>
          </div>
          
          <div className="space-y-4">
            <button className="flex items-center justify-between w-full py-3 border-b border-[#2a2c32]">
              <div className="text-left">
                <p className="text-white">Preferred Subtitle Language</p>
                <p className="text-sm text-[#a0a0a0]">English</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[#a0a0a0]" />
            </button>

            <button className="flex items-center justify-between w-full py-3">
              <div className="text-left">
                <p className="text-white">Subtitle Appearance</p>
                <p className="text-sm text-[#a0a0a0]">Default style</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[#a0a0a0]" />
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-[#141519] rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-[#a0a0a0]" />
            <h3 className="text-lg font-bold text-white">Notifications</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-[#2a2c32]">
              <div>
                <p className="text-white">Push Notifications</p>
                <p className="text-sm text-[#a0a0a0]">Get notified about new episodes</p>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-white">Email Updates</p>
                <p className="text-sm text-[#a0a0a0]">Receive news and recommendations</p>
              </div>
              <Switch checked={emailUpdates} onCheckedChange={setEmailUpdates} />
            </div>
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="bg-[#141519] rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-[#a0a0a0]" />
            <h3 className="text-lg font-bold text-white">Privacy & Security</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-[#2a2c32]">
              <div>
                <p className="text-white">Mature Content</p>
                <p className="text-sm text-[#a0a0a0]">Show 18+ content in search and browse</p>
              </div>
              <Switch checked={matureContent} onCheckedChange={setMatureContent} />
            </div>

            <button className="flex items-center justify-between w-full py-3 border-b border-[#2a2c32]">
              <div className="text-left">
                <p className="text-white">Change Password</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[#a0a0a0]" />
            </button>

            <button className="flex items-center justify-between w-full py-3">
              <div className="text-left">
                <p className="text-white">Two-Factor Authentication</p>
                <p className="text-sm text-[#a0a0a0]">Not enabled</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[#a0a0a0]" />
            </button>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-[#141519] rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-[#a0a0a0]" />
            <h3 className="text-lg font-bold text-white">Payment Methods</h3>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-[#23252b] rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-6 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center">
                <span className="text-xs text-white font-bold">VISA</span>
              </div>
              <div>
                <p className="text-white">**** **** **** 4242</p>
                <p className="text-sm text-[#a0a0a0]">Expires 12/28</p>
              </div>
            </div>
            <button className="text-sm text-[#F47521] hover:underline">Edit</button>
          </div>
          
          <button className="mt-4 text-sm text-[#F47521] hover:underline">
            + Add Payment Method
          </button>
        </div>

        {/* Danger Zone */}
        <div className="bg-[#141519] rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Account</h3>
          <div className="space-y-3">
            <button className="text-sm text-[#a0a0a0] hover:text-white transition-colors">
              Download My Data
            </button>
            <br />
            <button className="text-sm text-red-500 hover:text-red-400 transition-colors">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
