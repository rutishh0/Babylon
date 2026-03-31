"use client"

import { useState } from "react"
import { Gift, CreditCard, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function GiftCardPage() {
  const [code, setCode] = useState("")
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [redeemed, setRedeemed] = useState(false)
  const [error, setError] = useState("")

  const handleRedeem = async () => {
    if (!code.trim()) {
      setError("Please enter a gift card code")
      return
    }
    
    setIsRedeeming(true)
    setError("")
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Mock validation - in reality this would check against a database
    if (code.length === 16) {
      setRedeemed(true)
    } else {
      setError("Invalid gift card code. Please check and try again.")
    }
    
    setIsRedeeming(false)
  }

  if (redeemed) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="max-w-[500px] mx-auto px-4 text-center">
          <div className="p-6 bg-[#141519] rounded-lg">
            <CheckCircle className="w-16 h-16 text-[#22c55e] mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Gift Card Redeemed!</h1>
            <p className="text-[#a0a0a0] mb-4">
              Your gift card has been successfully applied to your account.
            </p>
            <div className="p-4 bg-[#23252b] rounded-lg mb-6">
              <p className="text-sm text-[#a0a0a0]">Amount added</p>
              <p className="text-3xl font-bold text-[#F47521]">$25.00</p>
            </div>
            <Button
              onClick={() => {
                setRedeemed(false)
                setCode("")
              }}
              className="bg-[#F47521] hover:bg-[#e06a1e] text-white"
            >
              Redeem Another Card
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#000000]">
      <div className="max-w-[600px] mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Gift className="w-12 h-12 text-[#F47521] mx-auto mb-4" />
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Redeem Gift Card</h1>
          <p className="text-[#a0a0a0]">
            Enter your gift card code below to add credit to your account
          </p>
        </div>

        {/* Redeem Form */}
        <div className="bg-[#141519] rounded-lg p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-white mb-2">
              Gift Card Code
            </label>
            <Input
              type="text"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase())
                setError("")
              }}
              className="bg-[#23252b] border-[#3a3c42] text-white placeholder:text-[#6a6c72] focus:border-[#F47521] text-center text-lg tracking-wider"
              maxLength={19}
            />
            {error && (
              <p className="text-sm text-red-500 mt-2">{error}</p>
            )}
          </div>
          
          <Button
            onClick={handleRedeem}
            disabled={isRedeeming}
            className="w-full bg-[#F47521] hover:bg-[#e06a1e] text-white font-medium py-3"
          >
            {isRedeeming ? "Redeeming..." : "Redeem Gift Card"}
          </Button>
        </div>

        {/* Info Section */}
        <div className="bg-[#141519] rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-4">Where to find your code</h3>
          <p className="text-sm text-[#a0a0a0] mb-4">
            Your gift card code is a 16-character code found on the back of your physical gift card 
            or in the email you received for digital gift cards.
          </p>
          <div className="p-4 bg-[#23252b] rounded-lg flex items-center gap-4">
            <CreditCard className="w-10 h-10 text-[#F47521]" />
            <div>
              <p className="text-sm text-white font-medium">Physical Gift Card</p>
              <p className="text-xs text-[#a0a0a0]">Scratch the silver panel on the back</p>
            </div>
          </div>
        </div>

        {/* Purchase Gift Card */}
        <div className="bg-[#141519] rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Need a Gift Card?</h3>
          <p className="text-sm text-[#a0a0a0] mb-4">
            Give the gift of anime! Purchase a Crunchyroll gift card for a friend or family member.
          </p>
          <Button
            variant="outline"
            className="w-full border-[#F47521] text-[#F47521] hover:bg-[#F47521] hover:text-white"
          >
            Buy Gift Card
          </Button>
        </div>
      </div>
    </div>
  )
}
