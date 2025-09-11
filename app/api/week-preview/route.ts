import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  return handleWeekPreview()
}

export async function GET() {
  return handleWeekPreview()
}

async function handleWeekPreview() {
  try {
    console.log('=== WEEK PREVIEW TRIGGERED ===', new Date().toISOString())
    
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

    console.log(`=== PROCESSING WEEK PREVIEW FOR WEEK ${currentWeek} SEASON ${season} ===`)

    // Get all users from database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('=== NO SUPABASE CONFIG ===')
      return NextResponse.json({ ok: false, message: 'Database not configured' })
    }

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
    console.log(`=== FOUND ${users.length} USERS FOR WEEK PREVIEW ===`)
    
    if (users.length === 0) {
      return NextResponse.json({ ok: true, message: 'No users to send preview to' })
    }

    // Process each user
    for (const user of users) {
      if (!user.tgUserId || !user.providers || user.providers.length === 0) {
        continue
      }
      
      const userTgId = user.tgUserId
      const sleeperUserId = user.providers[0].providerUserId
      
      try {
        // Get user's leagues
        const leaguesResponse = await fetch(`https://api.sleeper.app/v1/user/${sleeperUserId}/leagues/nfl/2024`)
        const userLeagues = leaguesResponse.ok ? await leaguesResponse.json() as any[] : []
        
        if (userLeagues.length === 0) {
          continue
        }

        const today = new Date()
        const dayName = today.toLocaleDateString('uk-UA', { weekday: 'long' })
        
        let previewMessage = `🏈 **${dayName} - Попередній огляд тижня ${currentWeek}**\\n\\n`
        
        // Analyze each league for upcoming matchups
        for (const league of userLeagues.slice(0, 4)) {
          try {
            // Get user's roster
            const rostersResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/rosters`)
            const rosters = rostersResponse.ok ? await rostersResponse.json() as any[] : []
            
            const userRoster = rosters.find(r => r.owner_id === sleeperUserId)
            if (!userRoster) continue

            // Get league users for team names
            const usersResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/users`)
            const leagueUsers = usersResponse.ok ? await usersResponse.json() as any[] : []
            
            const owner = leagueUsers.find(u => u.user_id === sleeperUserId)
            const teamName = owner?.display_name || owner?.username || 'Ваша команда'

            // Get upcoming matchup
            const matchupsResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/matchups/${currentWeek}`)
            const matchups = matchupsResponse.ok ? await matchupsResponse.json() as any[] : []
            
            const userMatchup = matchups.find(m => m.roster_id === userRoster.roster_id)
            let opponentName = 'TBD'
            
            if (userMatchup) {
              const opponentMatchup = matchups.find(m => 
                m.matchup_id === userMatchup.matchup_id && m.roster_id !== userRoster.roster_id
              )
              if (opponentMatchup) {
                const opponentRoster = rosters.find(r => r.roster_id === opponentMatchup.roster_id)
                const opponent = leagueUsers.find(u => u.user_id === opponentRoster?.owner_id)
                opponentName = opponent?.display_name || opponent?.username || 'Невідомий'
              }
            }

            previewMessage += `**${league.name}**\\n`
            previewMessage += `⚡ ${teamName} vs ${opponentName}\\n`
            
            // Get league standings
            const standings = [...rosters].sort((a, b) => {
              const winsA = a.settings?.wins || 0
              const winsB = b.settings?.wins || 0
              if (winsB !== winsA) return winsB - winsA
              return (b.settings?.fpts || 0) - (a.settings?.fpts || 0)
            })
            
            const userPosition = standings.findIndex(r => r.roster_id === userRoster.roster_id) + 1
            const totalTeams = standings.length
            
            previewMessage += `📊 ${userPosition}/${totalTeams} місце\\n\\n`

          } catch (leagueError) {
            console.error(`Error analyzing league ${league.league_id}:`, leagueError)
          }
        }

        previewMessage += `📅 **Що попереду цього тижня:**\\n`
        previewMessage += `• Перші ігри: четвер вечір\\n`
        previewMessage += `• Основні ігри: неділя\\n`
        previewMessage += `• Monday Night Football\\n\\n`
        
        previewMessage += `💡 **Нагадування:**\\n`
        previewMessage += `• Перевірте травми перед неділею\\n`
        previewMessage += `• Налаштуйте склад до четверга\\n`
        previewMessage += `• Слідкуйте за прогнозом погоди\\n\\n`
        
        previewMessage += `💬 Підтримка: @anton_kravchuk23`

        // Send to user
        await sendMessage(telegramToken, userTgId, previewMessage)
        console.log(`=== WEEK PREVIEW SENT TO USER ${userTgId} ===`)
        
      } catch (userError) {
        console.error(`Error processing user ${userTgId}:`, userError)
      }
    }

    console.log('=== WEEK PREVIEW COMPLETED ===')
    return NextResponse.json({ ok: true, message: 'Week preview sent' })
    
  } catch (error) {
    console.error('=== WEEK PREVIEW ERROR ===', error)
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
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to send week preview:', errorText)
      // Fallback to plain text
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text.replace(/\\*\\*/g, '').replace(/\\*/g, ''),
          disable_web_page_preview: true
        }),
      })
    } else {
      console.log('Week preview sent successfully')
    }
  } catch (error) {
    console.error('Error sending week preview:', error)
  }
}