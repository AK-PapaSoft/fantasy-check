import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  return handleWeeklyRecap()
}

export async function GET() {
  return handleWeeklyRecap()
}

async function handleWeeklyRecap() {
  try {
    console.log('=== WEEKLY RECAP TRIGGERED ===', new Date().toISOString())
    
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

    console.log(`=== PROCESSING CURRENT WEEK ${currentWeek} PROGRESS FOR SEASON ${season} ===`)

    // In a real implementation, we would:
    // 1. Get all users from the database
    // 2. Get their connected Sleeper accounts
    // 3. Get their leagues and last week's results
    // 4. Send personalized recap messages

    // Get all users from database who want weekly recaps
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
    console.log(`=== FOUND ${users.length} USERS FOR WEEKLY RECAP ===`)
    
    if (users.length === 0) {
      return NextResponse.json({ ok: true, message: 'No users to send recap to' })
    }

    // Process each user
    for (const user of users) {
      if (!user.tgUserId || !user.providers || user.providers.length === 0) {
        continue
      }
      
      const userTgId = user.tgUserId
      const sleeperUserId = user.providers[0].providerUserId
      
      try {
        // Get user's leagues for current season
        const leaguesResponse = await fetch(`https://api.sleeper.app/v1/user/${sleeperUserId}/leagues/nfl/${season}`)
        const userLeagues = leaguesResponse.ok ? await leaguesResponse.json() as any[] : []
        
        if (userLeagues.length === 0) {
          continue
        }

        // Build personalized weekly recap
        let totalWins = 0
        let totalLosses = 0
        let bestScore = 0
        let leagueResults: string[] = []
        
        for (const league of userLeagues.slice(0, 4)) { // Limit to 4 leagues
          try {
            // Get rosters to find user's roster
            const rostersResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/rosters`)
            const rosters = rostersResponse.ok ? await rostersResponse.json() as any[] : []
            
            const userRoster = rosters.find(r => r.owner_id === sleeperUserId)
            if (!userRoster) continue
            
            // Get league users for team names
            const usersResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/users`)
            const leagueUsers = usersResponse.ok ? await usersResponse.json() as any[] : []
            
            // Get current week's matchup progress
            const matchupsResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/matchups/${currentWeek}`)
            const matchups = matchupsResponse.ok ? await matchupsResponse.json() as any[] : []
            
            const userMatchup = matchups.find(m => m.roster_id === userRoster.roster_id)
            if (userMatchup) {
              const userScore = userMatchup.points || 0
              bestScore = Math.max(bestScore, userScore)
              
              // Find opponent
              const opponentMatchup = matchups.find(m => 
                m.matchup_id === userMatchup.matchup_id && m.roster_id !== userRoster.roster_id
              )
              
              if (opponentMatchup) {
                const opponentScore = opponentMatchup.points || 0
                
                // Check if games have started for this matchup
                const hasRealScores = userScore > 5 || opponentScore > 5
                
                // Get position in league based on season record
                const sortedRosters = [...rosters].sort((a, b) => 
                  (b.settings?.wins || 0) - (a.settings?.wins || 0)
                )
                const position = sortedRosters.findIndex(r => r.roster_id === userRoster.roster_id) + 1
                
                if (hasRealScores) {
                  // Games in progress - show current status
                  const leading = userScore > opponentScore
                  const statusIcon = leading ? '📈' : '📉'
                  const statusText = leading ? 'Ведете' : 'Відстаєте'
                  const scoreDiff = Math.abs(userScore - opponentScore)
                  
                  leagueResults.push(`• ${league.name}: ${position} місце | ${statusText} ${userScore.toFixed(1)}-${opponentScore.toFixed(1)} (+${scoreDiff.toFixed(1)}) ${statusIcon}`)
                  
                  // Track for stats (current week performance)
                  if (leading) totalWins++
                  else totalLosses++
                } else {
                  // Games not started yet
                  leagueResults.push(`• ${league.name}: ${position} місце | Ігри ще не почались 🕐`)
                }
                
                bestScore = Math.max(bestScore, userScore)
              }
            }
          } catch (leagueError) {
            console.error(`Error processing league ${league.league_id}:`, leagueError)
          }
        }
        
        if (leagueResults.length === 0) {
          continue // No results to show for this user
        }

        // Build personalized message
        const clockEmoji = '🕐'
        const speechBubbleEmoji = '💬'
        const weeklyRecapMessage = `📊 **Понеділковий огляд** (Тиждень ${currentWeek})

🏈 **Поточний стан матчапів:**
${leagueResults.join('\n')}

📈 **Поточна статистика:**
${totalWins > 0 || totalLosses > 0 ? 
  `🔥 Ведете: ${totalWins} матчап(ів)
📉 Відстаєте: ${totalLosses} матчап(ів)` : 
  `🕐 Ігри ще не почались`}
⭐ Найкращий результат: ${bestScore.toFixed(1)} очок

💡 **Що далі:**
• Матчі тривають до вівторка
• Слідкуйте за прогресом у /today
• Monday Night Football сьогодні ввечері

${clockEmoji} Оновлено: ${new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' })}

${speechBubbleEmoji} Підтримка: @anton_kravchuk23`

        // Send to this user
        await sendMessage(telegramToken, userTgId, weeklyRecapMessage)
        console.log(`=== WEEKLY RECAP SENT TO USER ${userTgId} ===`)
        
      } catch (userError) {
        console.error(`Error processing user ${userTgId}:`, userError)
      }
    }
    
    console.log('=== WEEKLY RECAP SENT SUCCESSFULLY ===')
    return NextResponse.json({ ok: true, message: 'Weekly recap sent' })
    
  } catch (error) {
    console.error('=== WEEKLY RECAP ERROR ===', error)
    return NextResponse.json({ 
      ok: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function sendMessage(token: string, chatId: number, text: string) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        disable_web_page_preview: true
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to send weekly recap message:', errorText)
    } else {
      console.log('Weekly recap message sent successfully')
    }
  } catch (error) {
    console.error('Error sending weekly recap message:', error)
  }
}