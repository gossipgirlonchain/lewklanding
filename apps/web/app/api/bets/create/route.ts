import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { XP_REWARDS, calculateBetXP } from '@/lib/xp'
import { updateStreak } from '@/lib/xp'
import { checkLevelUp, calculateLevel } from '@/lib/xp'
import { generateCueCardRarity, createCueCardForRarity } from '@/lib/cue-cards'
import { getPusher } from '@/lib/pusher'

const createBetSchema = z.object({
  marketId: z.string(),
  outcomeId: z.string(),
  stakeAmount: z.number().positive(),
  privyId: z.string(),
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('[API /bets/create] POST request received', {
    timestamp: new Date().toISOString(),
  })
  
  try {
    const body = await request.json()
    console.log('[API /bets/create] Request body:', { 
      marketId: body.marketId, 
      outcomeId: body.outcomeId, 
      stakeAmount: body.stakeAmount, 
      privyId: body.privyId?.substring(0, 10) + '...' // Partial privyId for privacy
    })
    
    const { marketId, outcomeId, stakeAmount, privyId } =
      createBetSchema.parse(body)
    
    console.log('[API /bets/create] Schema validation passed')

    // Get user
    console.log('[API /bets/create] Fetching user...')
    const user = await prisma.user.findUnique({
      where: { privyId },
      include: { balance: true, xp: true },
    })

    if (!user) {
      console.error('[API /bets/create] User not found for privyId:', privyId?.substring(0, 10) + '...')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('[API /bets/create] User found:', { userId: user.id, hasBalance: !!user.balance })

    if (!user.balance) {
      console.error('[API /bets/create] User balance not found for user:', user.id)
      return NextResponse.json(
        { error: 'User balance not found' },
        { status: 404 }
      )
    }

    // Verify market is open
    console.log('[API /bets/create] Fetching market:', marketId)
    const market = await prisma.market.findUnique({
      where: { id: marketId },
      include: { outcomes: true },
    })

    if (!market) {
      console.error('[API /bets/create] Market not found:', marketId)
      return NextResponse.json({ error: 'Market not found' }, { status: 404 })
    }

    console.log('[API /bets/create] Market found:', { 
      marketId: market.id, 
      status: market.status, 
      outcomesCount: market.outcomes.length 
    })

    if (market.status !== 'OPEN') {
      console.error('[API /bets/create] Market not open:', { marketId, status: market.status })
      return NextResponse.json(
        { error: 'Market is not open for betting' },
        { status: 400 }
      )
    }

    // Verify outcome exists for this market
    const outcome = market.outcomes.find((o) => o.id === outcomeId)
    if (!outcome) {
      return NextResponse.json(
        { error: 'Invalid outcome for this market' },
        { status: 400 }
      )
    }

    // Helper function to safely convert Decimal to number
    const toNumber = (value: any): number => {
      if (value == null) return 0
      if (typeof value === 'number') return value
      if (typeof value === 'string') return parseFloat(value) || 0
      if (value && typeof value.toNumber === 'function') return value.toNumber()
      return 0
    }

    // Convert stakeAmount to Decimal for database operations
    const stakeDecimal = new Prisma.Decimal(stakeAmount)

    // Minimum bet validation
    const MINIMUM_BET = 1.00
    if (stakeAmount < MINIMUM_BET) {
      return NextResponse.json(
        { error: `Minimum bet is C$${MINIMUM_BET.toFixed(2)}` },
        { status: 400 }
      )
    }

    // Get user balance - use whichever field has a value (handle migration)
    const balanceFromStandard = user.balance.standardBalance != null
      ? toNumber(user.balance.standardBalance)
      : 0
    
    const balanceFromLegacy = user.balance.balance != null
      ? toNumber(user.balance.balance)
      : 0
    
    // Use whichever balance field has a value > 0, otherwise use legacy
    const userBalance = (balanceFromStandard > 0) ? balanceFromStandard : balanceFromLegacy

    // Verify user has sufficient balance
    if (userBalance < stakeAmount) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      )
    }

    // Create bet and update balance/outcome pool in a transaction
    console.log('[API /bets/create] Starting transaction...')
    const result = await prisma.$transaction(async (tx) => {
      try {
        // Step 1: Get current balance within transaction
        console.log('[API /bets/create] Step 1: Getting balance...')
        const currentBalanceRecord = await tx.userBalance.findUnique({
          where: { userId: user.id },
        })
        
        if (!currentBalanceRecord) {
          throw new Error('User balance not found')
        }
        
        // Calculate current balance (use balance field, fallback to standardBalance if balance is null/0)
        const currentBalanceValue = currentBalanceRecord.balance != null
          ? toNumber(currentBalanceRecord.balance)
          : (currentBalanceRecord.standardBalance != null ? toNumber(currentBalanceRecord.standardBalance) : 0)
        
        console.log('[API /bets/create] Step 1 complete. Current balance:', currentBalanceValue)
        
        // Step 2: Calculate XP first (needed to determine if we should award bonus)
        console.log('[API /bets/create] Step 2: Calculating XP...')
        const oldXP = user.xp?.xp || 0
        const oldLevel = user.xp?.level || 1
        const xpEarned = calculateBetXP()
        const newXP = oldXP + xpEarned
        const newLevel = calculateLevel(newXP)
        const leveledUp = checkLevelUp(oldXP, newXP)
        const newStreak = updateStreak(user.xp?.lastPlayedAt || null, user.xp?.streakCount || 0)
        console.log('[API /bets/create] Step 2 complete. XP:', { oldXP, newXP, oldLevel, newLevel, leveledUp })

        // Step 3: Calculate final balance (after stake deduction and potential bonus)
        console.log('[API /bets/create] Step 3: Calculating final balance...')
        let finalBalance = Math.max(0, currentBalanceValue - stakeAmount)
        let bonusAwarded = false
        if (leveledUp && oldLevel === 1 && newLevel === 2) {
          // Award $5 bonus when leveling from 1→2
          finalBalance += 5.00
          bonusAwarded = true
          console.log('[API /bets/create] Adding $5 bonus for level 1→2')
        }
        
        // Update balance once with final amount
        const updatedBalance = await tx.userBalance.update({
          where: { userId: user.id },
          data: {
            balance: new Prisma.Decimal(finalBalance.toFixed(2))
          },
        })
        console.log('[API /bets/create] Step 3 complete. Final balance:', finalBalance)

        // Step 4: Create bet
        console.log('[API /bets/create] Step 4: Creating bet...')
        const bet = await tx.bet.create({
          data: {
            marketId,
            userId: user.id,
            outcomeId,
            stakeAmount: stakeDecimal,
          },
        })
        console.log('[API /bets/create] Step 4 complete. Bet ID:', bet.id)

        // Step 5: Update outcome pool
        console.log('[API /bets/create] Step 5: Updating outcome pool...')
        await tx.outcome.update({
          where: { id: outcomeId },
          data: { poolSize: { increment: stakeDecimal } },
        })
        console.log('[API /bets/create] Step 5 complete.')

        // Step 6: Get all outcomes
        console.log('[API /bets/create] Step 6: Getting all outcomes...')
        const allOutcomes = await tx.outcome.findMany({
          where: { marketId },
          select: {
            id: true,
            label: true,
            poolSize: true,
          },
        })
        console.log('[API /bets/create] Step 6 complete. Outcomes count:', allOutcomes.length)

        // Step 8: Update XP
        console.log('[API /bets/create] Step 8: Updating XP...')
        const currentPendingCueCards = user.xp?.pendingCueCards || 0
        const newPendingCueCards = leveledUp ? currentPendingCueCards + 1 : currentPendingCueCards
        
        await tx.userXP.upsert({
          where: { userId: user.id },
          update: {
            xp: newXP,
            level: newLevel,
            streakCount: newStreak,
            lastPlayedAt: new Date(),
            pendingCueCards: newPendingCueCards,
          },
          create: {
            userId: user.id,
            xp: newXP,
            level: newLevel,
            streakCount: newStreak,
            lastPlayedAt: new Date(),
            pendingCueCards: newPendingCueCards,
          },
        })
        console.log('[API /bets/create] Step 8 complete.')

        // Step 9: Log event
        console.log('[API /bets/create] Step 9: Logging event...')
        await tx.userEvent.create({
          data: {
            userId: user.id,
            type: 'bet_placed',
            metadata: {
              marketId,
              outcomeId,
              stakeAmount,
              betId: bet.id,
              leveledUp,
            },
          },
        })
        console.log('[API /bets/create] Step 9 complete.')

        return { bet, updatedBalance, leveledUp, outcomes: allOutcomes, bonusAwarded, newLevel }
      } catch (txError) {
        console.error('[API /bets/create] Transaction error at step:', {
          error: txError instanceof Error ? txError.message : String(txError),
          stack: txError instanceof Error ? txError.stack : undefined,
        })
        throw txError
      }
    })

    const duration = Date.now() - startTime
    console.log('[API /bets/create] Transaction completed successfully:', { 
      betId: result.bet.id, 
      userId: user.id, 
      marketId, 
      outcomeId, 
      stakeAmount,
      newBalance: result.updatedBalance.balance != null ? toNumber(result.updatedBalance.balance) : 0,
      leveledUp: result.leveledUp,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })

    // Calculate balance for response (simplified - single balance)
    // Get the final balance (after potential bonus addition)
    const finalBalanceRecord = await prisma.userBalance.findUnique({
      where: { userId: user.id },
    })
    
    const responseBalance = finalBalanceRecord?.balance != null
      ? toNumber(finalBalanceRecord.balance)
      : 0

    // Prepare response
    const response = NextResponse.json({
      success: true,
      bet: {
        ...result.bet,
        stakeAmount: toNumber(result.bet.stakeAmount),
        payoutAmount: toNumber(result.bet.payoutAmount),
      },
      balance: responseBalance,
      leveledUp: result.leveledUp,
      newLevel: result.newLevel,
      bonusAwarded: result.bonusAwarded || false,
    })

    // Broadcast market update via Pusher (don't await - send response immediately)
    if (result.outcomes && result.outcomes.length > 0) {
      const totalPool = result.outcomes.reduce(
        (sum, o) => sum + toNumber(o.poolSize),
        0
      )
      
      const outcomesWithOdds = result.outcomes.map((outcome) => ({
        id: outcome.id,
        label: outcome.label,
        poolSize: toNumber(outcome.poolSize),
        impliedOdds: totalPool > 0 ? toNumber(outcome.poolSize) / totalPool : 0,
      }))

      // Fire and forget - don't block response
      console.log('[API /bets/create] Broadcasting Pusher event for market:', marketId)
      getPusher()?.trigger(`market-${marketId}`, 'BET_PLACED', {
        marketId,
        outcomeId,
        stakeAmount,
        outcomes: outcomesWithOdds,
        totalPool,
      }).catch((pusherError) => {
        console.error('[API /bets/create] Pusher error (non-critical):', pusherError)
      })
    } else {
      console.warn('[API /bets/create] No outcomes to broadcast via Pusher')
    }

    return response
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[API /bets/create] Error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })
    console.error('Create bet error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    })
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
