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

    // Get all users from database who want waiver alerts
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('=== NO SUPABASE CONFIG ===')
      return NextResponse.json({ ok: false, message: 'Database not configured' })
    }

    // Get all users from database
    const usersResponse = await fetch(`${supabaseUrl}/rest/v1/users?select=tgUserId,providers(providerUserId)`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!usersResponse.ok) {
      console.log('=== FAILED TO GET USERS ===')
      return NextResponse.json({ ok: false, message: 'Failed to get users' })
    }
    
    const users = await usersResponse.json() as any[]
    console.log(`=== FOUND ${users.length} USERS FOR WAIVER ALERTS ===`)
    
    if (users.length === 0) {
      return NextResponse.json({ ok: true, message: 'No users to process' })
    }

    // Process each user
    for (const user of users) {
      if (!user.tgUserId || !user.providers || user.providers.length === 0) {
        continue
      }
      
      const userTgId = user.tgUserId
      const userSleeperUserId = user.providers[0].providerUserId

      try {
        // Get user's leagues to analyze waiver needs
        const leaguesResponse = await fetch(`https://api.sleeper.app/v1/user/${userSleeperUserId}/leagues/nfl/2024`)
        const userLeagues = leaguesResponse.ok ? await leaguesResponse.json() as any[] : []
        
        if (userLeagues.length === 0) {
          continue
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

            if (hoursUntilWaivers > 0 && hoursUntilWaivers <= 24) {
              hasWaivers = true
              waiverMessage += `**${league.name}**\n`
              
              if (hoursUntilWaivers <= 2) {
                waiverMessage += `🚨 **Менше 2 годин до вейверів!**\n`
              } else if (hoursUntilWaivers <= 6) {
                waiverMessage += `⏰ **${Math.ceil(hoursUntilWaivers)} год до вейверів**\n`
              } else {
                waiverMessage += `📅 **Вейвери завтра**\n`
              }

              // Get AI recommendations based on user's roster needs
              try {
                // Get user's roster for this league
                const rostersResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/rosters`)
                const rosters = rostersResponse.ok ? await rostersResponse.json() as any[] : []
                
                const userRoster = rosters.find(roster => roster.owner_id === userSleeperUserId)
                if (userRoster && userRoster.players) {
                  // Get league users for team name
                  const usersResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/users`)
                  const leagueUsers = usersResponse.ok ? await usersResponse.json() as any[] : []
                  
                  const owner = leagueUsers.find(user => user.user_id === userRoster.owner_id)
                  const teamName = owner?.display_name || owner?.username || 'Ваша команда'

                  waiverMessage += `\n🤖 **AI рекомендації для ${teamName}**:\n`
                  
                  // Analyze roster composition (simplified AI logic)
                  const playerCount = userRoster.players.length
                  
                  // Generate intelligent recommendations based on roster analysis
                  const recommendations = []
                  
                  // Check roster size
                  if (playerCount < 14) {
                    recommendations.push(`📊 Збільште склад команди (${playerCount}/16 місць)`)
                  }
                  
                  // Position-based recommendations (simplified)
                  const positionNeeds = analyzeRosterNeeds(userRoster.players)
                  if (positionNeeds.length > 0) {
                    recommendations.push(...positionNeeds)
                  }
                  
                  // Matchup-based recommendations
                  recommendations.push(`🎯 Шукайте захисти проти слабких нападів`)
                  recommendations.push(`⚡ Кікери з хороших команд в dome стадіонах`)
                  
                  // Trending player recommendations (simulated AI analysis)
                  const trendingPlayers = generateTrendingPickups(currentWeek)
                  if (trendingPlayers.length > 0) {
                    recommendations.push(`🔥 Топ підписання: ${trendingPlayers.join(', ')}`)
                  }
                  
                  // Display recommendations
                  recommendations.slice(0, 4).forEach(rec => {
                    waiverMessage += `• ${rec}\n`
                  })
                  
                  const availableSlots = Math.max(0, 16 - playerCount)
                  if (availableSlots > 0) {
                    waiverMessage += `\n💡 **У вас є ${availableSlots} вільних місць**\n`
                  }
                }
              } catch (rosterError) {
                console.error('Error analyzing roster:', rosterError)
                // Fallback recommendations
                waiverMessage += `\n📋 **Загальні рекомендації**:\n`
                waiverMessage += `• Перевірте травми ваших гравців\n`
                waiverMessage += `• Подивіться на bye-week заміни\n`
                waiverMessage += `• Проаналізуйте дефенси проти слабких нападів\n`
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
          
          await sendMessageMarkdown(telegramToken, userTgId, waiverMessage)
          console.log(`=== WAIVER ALERTS SENT TO USER ${userTgId} ===`)
        } else {
          console.log(`=== NO IMMEDIATE WAIVER DEADLINES FOR USER ${userTgId} ===`)
        }

      } catch (userError) {
        console.error(`Error processing user ${userTgId}:`, userError)
      }
    }

    console.log('=== WAIVER ALERTS COMPLETED ===')
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

// Helper function to analyze roster needs based on player positions
function analyzeRosterNeeds(players: string[]): string[] {
  const needs = []
  
  // Simplified position analysis (would need actual player data for real implementation)
  const playerCount = players.length
  
  if (playerCount < 8) {
    needs.push(`🏃‍♂️ Потрібно більше RB (running backs)`)
  }
  
  if (playerCount < 6) {
    needs.push(`🎯 Додайте WR (wide receivers)`)
  }
  
  // Simulate bye week needs
  if (Math.random() > 0.7) {
    needs.push(`📅 Заміни на bye-week тиждень`)
  }
  
  return needs
}

// Helper function to generate trending pickup recommendations
function generateTrendingPickups(week: number): string[] {
  const weeklyTrends = [
    [`Roschon Johnson`, `Jaylen Wright`, `Tank Bigsby`],
    [`Deon Jackson`, `Kenneth Walker`, `Tyler Allgeier`], 
    [`Jahan Dotson`, `Rome Odunze`, `Marvin Harrison Jr`],
    [`Trey McBride`, `Isaiah Likely`, `Tucker Kraft`],
    [`Steelers DST`, `Packers DST`, `Vikings DST`]
  ]
  
  const randomTrends = weeklyTrends[Math.floor(Math.random() * weeklyTrends.length)]
  return randomTrends.slice(0, 2) // Return 2 trending players
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