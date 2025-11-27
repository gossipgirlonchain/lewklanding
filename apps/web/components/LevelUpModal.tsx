'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface LevelUpModalProps {
  isOpen: boolean
  newLevel: number
  onClose: () => void
  onRevealReward?: () => void
  bonusAwarded?: boolean
}

export function LevelUpModal({ isOpen, newLevel, onClose, onRevealReward, bonusAwarded = false }: LevelUpModalProps) {
  const [showReward, setShowReward] = useState(false)

  if (!isOpen) return null

  const handleReveal = () => {
    setShowReward(true)
    if (onRevealReward) {
      onRevealReward()
    }
  }

  const handleClose = () => {
    setShowReward(false)
    onClose()
  }

  // Only show two-step flow for Level 2 with bonus reward
  const isLevel2WithBonus = newLevel === 2 && bonusAwarded

  if (showReward && isLevel2WithBonus) {
    // Second popup: Reward revealed
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-300">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">+$5 to Play!</h2>
            <p className="text-gray-600 mb-6">
              You've unlocked bonus funds.
            </p>
            <button
              onClick={handleClose}
              className="w-full bg-gradient-to-br from-[#DFFF44] to-[#F6F8FF] text-[#393D3F] font-semibold py-3 px-6 rounded-xl hover:shadow-lg transition-all duration-300"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    )
  }

  // First popup: Level up notification
  // For Level 2 with bonus, show "Reveal Reward" button
  // For other levels, show "Continue" button
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-300">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="text-center">
          <div className="text-6xl mb-4">✨</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">You Leveled Up!</h2>
          {isLevel2WithBonus ? (
            <>
              <p className="text-gray-600 mb-6">Tap to unlock your surprise.</p>
              <button
                onClick={handleReveal}
                className="w-full bg-gradient-to-br from-[#DFFF44] to-[#F6F8FF] text-[#393D3F] font-semibold py-3 px-6 rounded-xl hover:shadow-lg transition-all duration-300"
              >
                Reveal Reward
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-600 mb-6">You're now Level {newLevel}.</p>
              <button
                onClick={handleClose}
                className="w-full bg-gradient-to-br from-[#DFFF44] to-[#F6F8FF] text-[#393D3F] font-semibold py-3 px-6 rounded-xl hover:shadow-lg transition-all duration-300"
              >
                Continue
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

