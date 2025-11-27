'use client'

import { useEffect, useState, useMemo } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X, ChevronDown, ExternalLink, DollarSign, ArrowDown, Lock } from 'lucide-react'
import { canSellPosition, getSellQuote, type Market as SellMarket, type Position } from '@/lib/sell-position'
import { MarketChat } from '@/components/MarketChat'
import { getParimutuelPayout } from '@/lib/payout'
import { CallPlacedModal } from '@/components/PredictionMarkets/CallPlacedModal'
import { LevelUpModal } from '@/components/LevelUpModal'
import { SignUpModal } from '@/components/SignUpModal'

// Helper function to format CAD currency from cents
const formatCAD = (cents: number): string => {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

interface MarketTradingModalProps {
  marketId: string | null
  isOpen: boolean
  onClose: () => void
  onNextMarket?: () => void
  hasNextMarket?: boolean
}

export function MarketTradingModal({ 
  marketId, 
  isOpen, 
  onClose,
  onNextMarket,
  hasNextMarket = false
}: MarketTradingModalProps) {
  const { user, authenticated } = usePrivy()
  const queryClient = useQueryClient()
  const [market, setMarket] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)
  const [selectedSide, setSelectedSide] = useState<'yes' | 'no' | null>(null)
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null)
  const [selectedStake, setSelectedStake] = useState<number | null>(null)
  const [customStake, setCustomStake] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [callPlacedData, setCallPlacedData] = useState<{
    stakeAmount: number
    outcomeLabel: string
    xpEarned: number
  } | null>(null)
  const [levelUpData, setLevelUpData] = useState<{
    newLevel: number
    bonusAwarded: boolean
  } | null>(null)
  const [showSignUpModal, setShowSignUpModal] = useState(false)
  const [sellModalOpen, setSellModalOpen] = useState(false)
  const [sellQuote, setSellQuote] = useState<{ gross: number; fee: number; net: number; price: number } | null>(null)
  const [selectedPositionForSell, setSelectedPositionForSell] = useState<Position | null>(null)
  const [selling, setSelling] = useState(false)

  // Fetch market data
  const { data: marketData, isLoading: marketLoading, error: marketError } = useQuery({
    queryKey: ['market', marketId],
    queryFn: async () => {
      if (!marketId) throw new Error('Market ID is required')
      const response = await fetch(`/api/markets/${marketId}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch market' }))
        throw new Error(errorData.error || 'Failed to fetch market')
      }
      const data = await response.json()
      return data.market
    },
    enabled: !!marketId && isOpen,
    staleTime: 15 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  // Fetch user data
  const { data: userDataQuery, isLoading: userDataLoading } = useQuery({
    queryKey: ['user', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log('[MarketTradingModal] No user.id, skipping fetch')
        return null
      }
      console.log('[MarketTradingModal] Fetching user data for userId:', user.id)
      const response = await fetch(`/api/user?privyId=${user.id}`)
      if (!response.ok) throw new Error('Failed to fetch user')
      const data = await response.json()
      console.log('[MarketTradingModal] User data fetched:', {
        hasBalance: !!data.user?.balance,
        balance: data.user?.balance,
        betsCount: data.user?.bets?.length || 0,
      })
      return data.user
    },
    enabled: !!user?.id && authenticated && isOpen,
    staleTime: 0, // Always consider stale so it refetches when invalidated
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Always fetch on mount to ensure balance loads
  })

  // Set market and user data
  useEffect(() => {
    if (marketData) setMarket(marketData)
    if (userDataQuery) setUserData(userDataQuery)
  }, [marketData, userDataQuery])

  // Prepare data for useMemo hooks (before early return)
  const displayMarket = market

  // Update selectedOutcome when side changes
  useEffect(() => {
    if (!displayMarket || !selectedSide) return

    // For binary markets, use first outcome for "yes" and second for "no"
    if (displayMarket.type === 'BINARY' && displayMarket.outcomes.length >= 2) {
      const outcome = selectedSide === 'yes' 
        ? displayMarket.outcomes[0] 
        : displayMarket.outcomes[1]
      setSelectedOutcome(outcome.id)
    } else {
      // Try to match by label
      const outcome = displayMarket.outcomes.find(
        (o: any) => (selectedSide === 'yes' && (o.label.toLowerCase() === 'yes' || o.label.toLowerCase() === "it will")) ||
               (selectedSide === 'no' && (o.label.toLowerCase() === 'no' || o.label.toLowerCase() === "it won't"))
      )
      if (outcome) {
        setSelectedOutcome(outcome.id)
      }
    }
  }, [selectedSide, displayMarket])
  // Use balance field directly (simplified - no bonus/standard distinction)
  const userBalance = userData?.balance?.balance != null
    ? (typeof userData.balance.balance === 'number'
        ? userData.balance.balance
        : parseFloat(String(userData.balance.balance)) || 0)
    : 0
  
  // Debug logging
  console.log('[MarketTradingModal] Balance calculation:', {
    userData: !!userData,
    hasBalance: !!userData?.balance,
    userBalance,
    balanceObject: userData?.balance,
  })
  const userBets = userData?.bets || []
  
  // Check if 24-hour market
  const is24HourMarket = market?.experienceType === 'TWENTY_FOUR_HOUR' || market?.type === '24-Hour'

  // Calculate positions - must be before early return
  const positions = useMemo(() => {
    if (!displayMarket || !userBets.length) return []
    
    return userBets
      .filter((bet: any) => bet.marketId === displayMarket.id)
      .map((bet: any) => ({
        id: bet.id,
        outcomeId: bet.outcomeId,
        outcomeLabel: bet.outcome.label,
        stakeAmount: bet.stakeAmount,
        market: displayMarket as SellMarket,
      }))
  }, [displayMarket, userBets])

  const positionsWithSellStatus = useMemo(() => {
    return positions.map((position) => {
      const canSell = canSellPosition(position.market, position)
      const currentOdds = displayMarket?.outcomes?.find((o: any) => o.id === position.outcomeId)?.impliedOdds || 0
      return { position, canSell, currentOdds }
    })
  }, [positions, displayMarket])

  // Outcomes - calculate before early return
  const firstOutcome = displayMarket?.outcomes?.[0]
  const secondOutcome = displayMarket?.outcomes?.[1]
  
  // Safely convert poolSize to number (handles Decimal types)
  const toNumber = (value: any): number => {
    if (value == null) return 0
    if (typeof value === 'number') return value
    if (typeof value === 'string') return parseFloat(value) || 0
    if (value && typeof value.toNumber === 'function') return value.toNumber()
    return 0
  }
  
  const yesPool = firstOutcome ? toNumber(firstOutcome.poolSize) : 0
  const noPool = secondOutcome ? toNumber(secondOutcome.poolSize) : 0
  const totalPool = yesPool + noPool
  const yesPercent = totalPool > 0 ? Math.round((yesPool / totalPool) * 100) : 0
  const noPercent = totalPool > 0 ? Math.round((noPool / totalPool) * 100) : 0

  // Stake options - must be before early return
  // Always show buttons, even if balance is 0 (they'll be disabled)
  const stakeOptions = useMemo(() => {
    const options = [1, 5, 10, 25]
    if (userBalance > 25) {
      options.push(Math.floor(userBalance))
    }
    // Remove duplicates and sort, but don't filter by balance
    // (buttons will be disabled if stake > userBalance)
    return options.filter((stake, index, arr) => 
      stake > 0 && arr.indexOf(stake) === index
    ).sort((a, b) => a - b)
  }, [userBalance])

  // Potential payout - must be before early return
  const potentialPayout = useMemo(() => {
    if (!selectedStake || !selectedSide) return 0
    return getParimutuelPayout(selectedSide, selectedStake, yesPool, noPool)
  }, [selectedStake, selectedSide, yesPool, noPool])

  // Early return if modal is not open - MUST be after ALL hooks
  if (!isOpen || !marketId) return null

  // Show loading state if market data is still loading
  if (marketLoading || !displayMarket) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8">
          <p>Loading market...</p>
          {marketError && (
            <p className="text-red-500 text-sm mt-2">Error: {marketError.message}</p>
          )}
        </div>
      </div>
    )
  }

  // Handle bet placement
  const handlePlaceBet = async () => {
    // Check if user is authenticated
    if (!authenticated || !user?.id) {
      setShowSignUpModal(true)
      return
    }

    if (!selectedStake || !selectedOutcome) {
      console.error('[MarketTradingModal] Missing required fields:', { selectedStake, selectedOutcome })
      alert('Please select an outcome and stake amount')
      return
    }

    // Validate outcome exists in market
    const validOutcome = displayMarket?.outcomes?.find((o: any) => o.id === selectedOutcome)
    if (!validOutcome) {
      console.error('[MarketTradingModal] Invalid outcome:', { 
        selectedOutcome, 
        availableOutcomes: displayMarket?.outcomes?.map((o: any) => ({ id: o.id, label: o.label }))
      })
      alert('Invalid outcome selected. Please try selecting again.')
      return
    }

    setSubmitting(true)
    try {
      console.log('[MarketTradingModal] Placing bet:', {
        marketId: displayMarket.id,
        outcomeId: selectedOutcome,
        outcomeLabel: validOutcome.label,
        stakeAmount: selectedStake,
      })
      
      const response = await fetch('/api/bets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId: displayMarket.id,
          outcomeId: selectedOutcome,
          stakeAmount: selectedStake,
          privyId: user.id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to place bet')
      }

      const result = await response.json()
      const outcomeLabel = displayMarket.outcomes.find((o: any) => o.id === selectedOutcome)?.label || 'Unknown'
      
      // Check for level up
      if (result.leveledUp && result.newLevel) {
        setLevelUpData({
          newLevel: result.newLevel,
          bonusAwarded: result.bonusAwarded || false,
        })
      }
      
      setCallPlacedData({
        stakeAmount: selectedStake,
        outcomeLabel,
        xpEarned: 3, // 3 XP per bet
      })

      // Invalidate and refetch queries to refresh data immediately
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['market', marketId] }),
        queryClient.invalidateQueries({ queryKey: ['user', user.id] }),
        queryClient.invalidateQueries({ queryKey: ['markets'] }),
      ])
      
      // Force immediate refetch of user data so the new bet shows up
      await queryClient.refetchQueries({ queryKey: ['user', user.id] })

      // Reset form
      setSelectedStake(null)
      setSelectedSide(null)
      setSelectedOutcome(null)
      setSubmitting(false)
    } catch (error: any) {
      console.error('Error placing bet:', error)
      alert(error.message || 'Failed to place bet')
      setSubmitting(false)
    }
  }

  // Handle sell position
  const handleOpenSellModal = (position: Position) => {
    const quote = getSellQuote(position.market, position)
    setSellQuote(quote)
    setSelectedPositionForSell(position)
    setSellModalOpen(true)
  }

  const handleSellPosition = async () => {
    if (!selectedPositionForSell || !sellQuote || !authenticated || !user?.id) return

    setSelling(true)
    try {
      const response = await fetch('/api/bets/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          betId: selectedPositionForSell.id,
          privyId: user.id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to sell position')
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['market', marketId] })
      queryClient.invalidateQueries({ queryKey: ['user', user.id] })
      queryClient.invalidateQueries({ queryKey: ['markets'] })

      setSellModalOpen(false)
      setSellQuote(null)
      setSelectedPositionForSell(null)
      setSelling(false)
    } catch (error: any) {
      console.error('Error selling position:', error)
      alert(error.message || 'Failed to sell position')
      setSelling(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl shadow-2xl w-[95vw] max-w-7xl max-h-[85vh] overflow-hidden flex flex-col relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white hover:bg-gray-100 transition-colors shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Next market button - positioned outside modal on the right */}
          {hasNextMarket && onNextMarket && (
            <button
              onClick={onNextMarket}
              className="fixed bottom-6 z-10 p-3 rounded-full bg-[#DFFF44] text-[#393D3F] shadow-lg border-2 border-[#DFFF44] hover:bg-[#B8D93A] hover:scale-110 transition-all duration-200"
              style={{ 
                right: 'max(1rem, calc(50% - min(47.5vw, 42rem) - 5rem))',
              }}
            >
              <ChevronDown className="w-6 h-6" />
            </button>
          )}

          {/* Content - 3 Column Layout */}
          <div className="flex-1 overflow-hidden p-5">
            <div className="grid grid-cols-[1.3fr_1.2fr_1.1fr] gap-5 items-start h-full">
              {/* LEFT COLUMN - Market Info & Context */}
              <div className="flex flex-col overflow-y-auto pr-3 pb-0 h-full max-h-full">
                {/* Header */}
                <div className="flex items-start gap-2 mb-3">
                  {displayMarket.image && (
                    <div className="flex-shrink-0">
                      <img
                        src={displayMarket.image}
                        alt={displayMarket.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold text-gray-900 mb-1.5 leading-tight">
                      {displayMarket.title}
                    </h1>
                  </div>
                </div>

                {/* Description */}
                {displayMarket.description && (
                  <div className="mb-3">
                    <h3 className="text-xs font-semibold text-gray-900 mb-1.5">Description</h3>
                    <p className="text-xs text-gray-700 leading-relaxed border-t border-gray-200 pt-2">
                      {displayMarket.description}
                    </p>
                  </div>
                )}

                {/* Market Stats */}
                <div className="mb-3">
                  <h3 className="text-xs font-semibold text-gray-900 mb-1.5">Market stats</h3>
                  <div className="border-t border-gray-200 pt-2 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total volume:</span>
                      <span className="font-medium text-gray-900">✨ C${totalPool.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Number of bets:</span>
                      <span className="font-medium text-gray-900">{displayMarket.totalBets || 0}</span>
                    </div>
                    {firstOutcome && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Yes pool:</span>
                        <span className="font-medium text-gray-900">
                          C${yesPool.toFixed(2)} ({yesPercent}%)
                        </span>
                      </div>
                    )}
                    {secondOutcome && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">No pool:</span>
                        <span className="font-medium text-gray-900">
                          C${noPool.toFixed(2)} ({noPercent}%)
                        </span>
                      </div>
                    )}
                    {displayMarket.createdAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(displayMarket.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                    {(displayMarket.reference_link || displayMarket.referenceLink) && (
                      <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                        <span className="text-gray-600">Source article:</span>
                        <a
                          href={displayMarket.reference_link || displayMarket.referenceLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View Source</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Your Stakes */}
                <div className="mt-3 mb-0">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    Your Stakes
                    {is24HourMarket && (
                      <div className="relative group">
                        <Lock className="w-4 h-4 text-gray-400" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                          You can't sell on 24-hour markets
                          <div className="absolute top-full left-4 -mt-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                        </div>
                      </div>
                    )}
                  </h3>
                  {positionsWithSellStatus.length > 0 ? (
                    <div className="space-y-2">
                      {positionsWithSellStatus.map(({ position, canSell }) => (
                        <div key={position.id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-sm font-medium">{position.outcomeLabel}</div>
                              <div className="text-xs text-gray-500">C${position.stakeAmount.toFixed(2)}</div>
                            </div>
                            {canSell && (
                              <button
                                onClick={() => handleOpenSellModal(position)}
                                className="px-3 py-1 rounded-lg text-xs font-medium bg-white text-black border-2 border-gray-300 hover:bg-gray-50"
                              >
                                <DollarSign className="w-3.5 h-3.5 inline mr-1" />
                                Sell
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 italic">No stakes yet</div>
                  )}
                </div>
              </div>

              {/* MIDDLE COLUMN - Betting Terminal */}
              <div className="flex flex-col overflow-y-auto pb-0 h-full max-h-full">
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Your Call</h2>
                  
                  {/* Outcome buttons */}
                  {displayMarket.outcomes?.length >= 2 && (
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          console.log('[MarketTradingModal] Yes button clicked', { firstOutcome: firstOutcome?.id })
                          setSelectedSide('yes')
                          setSelectedOutcome(firstOutcome?.id || null)
                        }}
                        className={`py-4 px-3 rounded-xl font-semibold transition-colors cursor-pointer ${
                          selectedSide === 'yes'
                            ? 'bg-gradient-to-br from-[#DFFF44] to-[#F6F8FF] text-[#393D3F] shadow-lg border-2 border-[#DFFF44]'
                            : 'bg-[#F6F8FF] text-[#393D3F] hover:bg-[#DFFF44] border-2 border-[#DFFF44]'
                        }`}
                      >
                        <div className="text-sm mb-1">{firstOutcome?.label || 'Yes'}</div>
                        <div className="text-2xl font-bold">{yesPercent}%</div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          console.log('[MarketTradingModal] No button clicked', { secondOutcome: secondOutcome?.id })
                          setSelectedSide('no')
                          setSelectedOutcome(secondOutcome?.id || null)
                        }}
                        className={`py-4 px-3 rounded-xl font-semibold transition-colors cursor-pointer ${
                          selectedSide === 'no'
                            ? 'bg-gradient-to-br from-[#393D3F] to-[#393D3F] text-white shadow-lg border-2 border-[#393D3F]'
                            : 'bg-gray-100 text-black hover:bg-gray-200 border-2 border-gray-200'
                        }`}
                      >
                        <div className="text-sm mb-1">{secondOutcome?.label || 'No'}</div>
                        <div className="text-2xl font-bold">{noPercent}%</div>
                      </button>
                    </div>
                  )}

                  {/* Stake selection - Directly under outcome buttons */}
                  {displayMarket.status === 'OPEN' && authenticated && (
                    <>
                      <div className="mb-4">
                        <div className="text-sm text-gray-700 mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>Choose your stake:</span>
                            {is24HourMarket && (
                              <div className="relative group">
                                <Lock className="w-4 h-4 text-gray-400" />
                                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                                  You can't sell on 24-hour markets
                                  <div className="absolute top-full left-4 -mt-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Your Balance:</span>
                            <span className="font-semibold">C${userBalance.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {stakeOptions.map((stake) => (
                            <button
                              key={stake}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                console.log('[MarketTradingModal] Stake button clicked:', { stake, userBalance })
                                setSelectedStake(stake)
                                setCustomStake('') // Clear custom input when selecting preset
                              }}
                              disabled={stake > userBalance}
                              className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                                stake > userBalance
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : selectedStake === stake && !customStake
                                  ? 'bg-[#393D3F] text-white cursor-pointer'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                              }`}
                            >
                              C${stake}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom amount input */}
                      <div className="mb-4">
                        <div className="text-sm text-gray-700 mb-2">Or enter custom amount:</div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">C$</span>
                          <input
                            type="number"
                            min="0"
                            max={userBalance}
                            step="0.01"
                            placeholder="0.00"
                            value={customStake}
                            onChange={(e) => {
                              const value = e.target.value
                              setCustomStake(value)
                              const numValue = parseFloat(value)
                              if (!isNaN(numValue) && numValue >= 0 && numValue <= userBalance) {
                                setSelectedStake(numValue)
                              } else if (value === '') {
                                setSelectedStake(null)
                              }
                            }}
                            onBlur={() => {
                              if (customStake && !isNaN(parseFloat(customStake))) {
                                const numValue = parseFloat(customStake)
                                if (numValue > userBalance) {
                                  setCustomStake(userBalance.toFixed(2))
                                  setSelectedStake(userBalance)
                                } else if (numValue < 0) {
                                  setCustomStake('')
                                  setSelectedStake(null)
                                }
                              }
                            }}
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#DFFF44] text-sm"
                          />
                        </div>
                      </div>

                      {/* Payout, XP Info - Below stake selection */}
                      <div className="mb-4 space-y-2 text-sm bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Potential Payout:</span>
                          <span className="font-semibold">
                            {selectedStake && selectedSide ? `C$${potentialPayout.toFixed(2)}` : 'C$0.00'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                          <span className="text-gray-600">XP Earned:</span>
                          <span className="font-semibold text-green-600">
                            {selectedStake ? `+3xp ✨ + ${Math.floor(selectedStake * 3)}xp if you win` : '+3xp ✨ + 0xp if you win'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={handlePlaceBet}
                        disabled={!selectedStake || !selectedSide || submitting || userBalance < (selectedStake || 0)}
                        className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                          selectedStake && selectedSide && !submitting && userBalance >= (selectedStake || 0)
                            ? 'bg-gradient-to-r from-[#DFFF44] to-[#B8D93A] text-[#393D3F] hover:from-[#DFFF44] hover:to-[#DFFF44] shadow-lg border-2 border-[#DFFF44] cursor-pointer'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {submitting ? 'Placing...' : 
                         !selectedSide ? 'Select Yes or No' :
                         !selectedStake ? 'Select a stake amount' :
                         userBalance < (selectedStake || 0) ? 'Insufficient balance' :
                         'Place Call'}
                      </button>
                    </>
                  )}

                  {displayMarket.status !== 'OPEN' && (
                    <div className="rounded-xl bg-gray-100 px-4 py-3 text-center text-sm text-gray-600 border border-gray-200">
                      {displayMarket.status === 'CLOSED' 
                        ? 'This market is closed for new bets.'
                        : 'This market has been resolved.'}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN - Chat */}
              {displayMarket && displayMarket.id && (
                <div className="flex flex-col overflow-hidden h-full">
                  <MarketChat marketId={displayMarket.id} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Call Placed Modal */}
      {callPlacedData && (
        <CallPlacedModal
          isOpen={!!callPlacedData}
          onClose={() => setCallPlacedData(null)}
          stakeAmount={callPlacedData.stakeAmount}
          outcomeLabel={callPlacedData.outcomeLabel}
          xpEarned={callPlacedData.xpEarned}
          next24HourMarket={null}
        />
      )}

      {/* Level Up Modal */}
      {levelUpData && (
        <LevelUpModal
          isOpen={!!levelUpData}
          newLevel={levelUpData.newLevel}
          bonusAwarded={levelUpData.bonusAwarded || false}
          onClose={() => setLevelUpData(null)}
          onRevealReward={() => {
            // Refresh user data to show new bonus balance
            queryClient.invalidateQueries({ queryKey: ['user', user?.id] })
          }}
        />
      )}

      {/* Sign Up Modal for Guests */}
      <SignUpModal
        isOpen={showSignUpModal}
        onClose={() => setShowSignUpModal(false)}
      />

      {/* Sell Position Modal */}
      {sellModalOpen && sellQuote && selectedPositionForSell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Sell Position</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">You will receive:</p>
              <p className="text-2xl font-bold text-green-600">C${sellQuote.net.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">
                Fee: C${sellQuote.fee.toFixed(2)}
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setSellModalOpen(false)
                  setSellQuote(null)
                  setSelectedPositionForSell(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSellPosition}
                disabled={selling}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-lg hover:from-emerald-600 hover:to-green-600 disabled:opacity-50"
              >
                {selling ? 'Selling...' : 'Confirm Sell'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

