import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('=== WAIVER ALERTS TRIGGERED ===', new Date().toISOString())
    
    const telegramToken = process.env.TELEGRAM_TOKEN
    if (!telegramToken) {
      console.log('=== NO TELEGRAM_TOKEN ===')
      return NextResponse.json({ ok: false, message: 'No token configured' })
    }

    // Get current NFL state
    const nflStateResponse = await fetch('https://api.sleeper.app/v1/state/nfl')
    const nflState = nflStateResponse.ok ? await nflStateResponse.json() as any : null
    
    if (!nflState) {
      console.log('=== COULD NOT GET NFL STATE ===')
      return NextResponse.json({ ok: false, message: 'Could not get NFL state' })
    }

    const currentWeek = nflState.week
    const season = nflState.season

    console.log(`=== PROCESSING WAIVER ALERTS FOR WEEK ${currentWeek} SEASON ${season} ===`)

    // Get users from database who want waiver alerts
    // For now, send to test user
    const testUserTgId = 123456789

    try {
      // Get user's leagues to analyze waiver needs
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      let userLeagues: any[] = []
      let userSleeperUserId: string | null = null
      
      if (supabaseUrl && supabaseKey) {
        // Get user's Sleeper ID from database
        const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?tgUserId=eq.${testUserTgId}&select=providers(providerUserId)`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (userResponse.ok) {
          const users = await userResponse.json() as any[]
          if (users.length > 0 && users[0].providers.length > 0) {
            userSleeperUserId = users[0].providers[0].providerUserId
            
            // Get user's leagues
            const leaguesResponse = await fetch(`https://api.sleeper.app/v1/user/${userSleeperUserId}/leagues/nfl/2024`)
            userLeagues = leaguesResponse.ok ? await leaguesResponse.json() as any[] : []
          }
        }
      }
      
      if (userLeagues.length === 0) {
        console.log('=== NO LEAGUES FOUND FOR WAIVER ALERTS ===')
        return NextResponse.json({ ok: true, message: 'No leagues to process' })
      }

      let waiverMessage = `**⏰ Вейвер Алерт**\n\n`
      let hasWaivers = false

      // Process each league for waiver information
      for (const league of userLeagues.slice(0, 3)) {
        try {
          // Get league settings to determine waiver day/time
          const leagueSettings = league.settings || {}
          const waiverDay = leagueSettings.waiver_day_of_week || 2 // Tuesday default
          const waiverHour = leagueSettings.daily_waivers_hour || 0 // Midnight default

          // Calculate waiver deadline (simplified - should be more sophisticated)
          const now = new Date()
          const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
          const hoursUntilWaivers = calculateHoursUntilWaivers(currentDay, now.getHours(), waiverDay, waiverHour)

          if (hoursUntilWaivers > 0 && hoursUntilWaivers <= 2) {
            hasWaivers = true
            waiverMessage += `**${league.name}**\n`
            
            if (hoursUntilWaivers <= 1) {
              waiverMessage += `🚨 **Менше години до вейверів!**\n`
            } else {
              waiverMessage += `⏳ **${Math.ceil(hoursUntilWaivers)} год до вейверів**\n`
            }

            // Get available players (simplified - in real implementation would analyze free agents)
            waiverMessage += `\n📋 **Рекомендації**:\n`
            waiverMessage += `• Перевірте травми ваших гравців\n`
            waiverMessage += `• Подивіться на bye-week заміни\n`
            waiverMessage += `• Проаналізуйте дефенси проти слабких нападів\n`
            
            // Analyze user's roster needs (simplified)
            try {
              // Get user's roster for this league
              const rostersResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/rosters`)
              const rosters = rostersResponse.ok ? await rostersResponse.json() as any[] : []
              
              const userRoster = rosters.find(roster => roster.owner_id === userSleeperUserId)
              if (userRoster && userRoster.players) {
                const playerCount = userRoster.players.length
                const benchSize = leagueSettings.bench_lock || 6
                const availableSlots = benchSize - playerCount
                
                if (availableSlots > 0) {
                  waiverMessage += `\n💡 **У вас є ${availableSlots} вільних місць**\n`
                }
              }
            } catch (rosterError) {
              console.error('Error analyzing roster:', rosterError)
            }

            waiverMessage += '\n'
          }
        } catch (leagueError) {
          console.error(`Error processing league ${league.league_id} for waivers:`, leagueError)
        }
      }

      if (hasWaivers) {
        waiverMessage += `🎯 **Не забудьте зробити заявки вчасно!**\n\n`
        waiverMessage += `**Підтримка** (і психологічна) від @anton_kravchuk23`
        
        await sendMessageMarkdown(telegramToken, testUserTgId, waiverMessage)
        console.log('=== WAIVER ALERTS SENT ===')
      } else {
        console.log('=== NO IMMEDIATE WAIVER DEADLINES ===')
      }

    } catch (error) {
      console.error('=== ERROR PROCESSING WAIVER ALERTS ===', error)
    }

    return NextResponse.json({ ok: true, message: 'Waiver alerts processed' })
    
  } catch (error) {
    console.error('=== WAIVER ALERTS ERROR ===', error)
    return NextResponse.json({ 
      ok: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to calculate hours until next waiver deadline
function calculateHoursUntilWaivers(currentDay: number, currentHour: number, waiverDay: number, waiverHour: number): number {
  // Simple calculation - could be more sophisticated
  const now = new Date()
  const nextWaiver = new Date()
  
  // Set to next waiver day
  const daysUntil = (waiverDay - currentDay + 7) % 7
  if (daysUntil === 0 && currentHour >= waiverHour) {
    // Waiver day has passed, next week
    nextWaiver.setDate(nextWaiver.getDate() + 7)
  } else {
    nextWaiver.setDate(nextWaiver.getDate() + daysUntil)
  }
  
  nextWaiver.setHours(waiverHour, 0, 0, 0)
  
  const diffMs = nextWaiver.getTime() - now.getTime()
  return diffMs / (1000 * 60 * 60) // Convert to hours
}

async function sendMessageMarkdown(token: string, chatId: number, text: string) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to send waiver alert:', errorText)
      // Fallback to plain text
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text.replace(/\*\*/g, '').replace(/\*/g, ''),
          disable_web_page_preview: true
        }),
      })
    } else {
      console.log('Waiver alert sent successfully')
    }
  } catch (error) {
    console.error('Error sending waiver alert:', error)
  }
}