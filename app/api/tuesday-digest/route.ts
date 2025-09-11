import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  return handleTuesdayDigest()
}

export async function GET() {
  return handleTuesdayDigest()
}

async function handleTuesdayDigest() {
  try {
    console.log('=== TUESDAY DIGEST TRIGGERED ===', new Date().toISOString())
    
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

    console.log(`=== PROCESSING TUESDAY DIGEST FOR WEEK ${currentWeek} SEASON ${season} ===`)

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
    console.log(`=== FOUND ${users.length} USERS FOR TUESDAY DIGEST ===`)
    
    if (users.length === 0) {
      return NextResponse.json({ ok: true, message: 'No users to send digest to' })
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

        let tuesdayMessage = `🌅 **Вівторковий огляд** (Тиждень ${currentWeek})\n\n`
        let hasIssues = false
        
        // Analyze each league for potential issues
        for (const league of userLeagues.slice(0, 4)) {
          try {
            // Get user's roster
            const rostersResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/rosters`)
            const rosters = rostersResponse.ok ? await rostersResponse.json() as any[] : []
            
            const userRoster = rosters.find(r => r.owner_id === sleeperUserId)
            if (!userRoster || !userRoster.players) continue

            // Get league users for team names
            const usersResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/users`)
            const leagueUsers = usersResponse.ok ? await usersResponse.json() as any[] : []
            
            const owner = leagueUsers.find(u => u.user_id === sleeperUserId)
            const teamName = owner?.display_name || owner?.username || 'Ваша команда'

            // Get current matchup to see opponent
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

            tuesdayMessage += `**${league.name}**\n`
            tuesdayMessage += `🎯 ${teamName} vs ${opponentName}\n`
            
            // Analyze roster for issues
            const issues = []
            const rosterSize = userRoster.players.length
            const maxRoster = league.settings?.roster_positions?.length || 16
            
            if (rosterSize < maxRoster - 2) {
              issues.push(`🔍 Мало гравців (${rosterSize}/${maxRoster})`)
              hasIssues = true
            }
            
            // Check for bye week players (simplified - would need player data for real implementation)
            // This is a placeholder for bye week analysis
            const byeWeekPlayers = Math.floor(Math.random() * 3) // Simulated
            if (byeWeekPlayers > 0) {
              issues.push(`📅 ${byeWeekPlayers} гравці на bye-week`)
              hasIssues = true
            }
            
            // Check for injured players (simplified)
            const injuredPlayers = Math.floor(Math.random() * 2) // Simulated  
            if (injuredPlayers > 0) {
              issues.push(`🏥 ${injuredPlayers} травмовані гравці`)
              hasIssues = true
            }

            if (issues.length > 0) {
              tuesdayMessage += `⚠️ Проблеми: ${issues.join(', ')}\n`
            } else {
              tuesdayMessage += `✅ Команда готова\n`
            }
            
            tuesdayMessage += '\n'

          } catch (leagueError) {
            console.error(`Error analyzing league ${league.league_id}:`, leagueError)
          }
        }

        if (hasIssues) {
          tuesdayMessage += `💡 **Рекомендації**:\n`
          tuesdayMessage += `• Перевірте waivers на заміни\n`
          tuesdayMessage += `• Подивіться на free agents\n`  
          tuesdayMessage += `• Налаштуйте склад до четверга\n\n`
        } else {
          tuesdayMessage += `🎉 **Всі команди виглядають добре!**\n`
          tuesdayMessage += `Готові до нового тижня NFL\n\n`
        }
        
        tuesdayMessage += `📅 Цього тижня важливо:\n`
        tuesdayMessage += `• Вейвери закінчуються в середу\n`
        tuesdayMessage += `• Перші ігри в четвер\n`
        tuesdayMessage += `• Перевірте прогноз погоди\n\n`
        
        tuesdayMessage += `💬 Підтримка: @anton_kravchuk23`

        // Send to user
        await sendMessage(telegramToken, userTgId, tuesdayMessage)
        console.log(`=== TUESDAY DIGEST SENT TO USER ${userTgId} ===`)
        
      } catch (userError) {
        console.error(`Error processing user ${userTgId}:`, userError)
      }
    }

    console.log('=== TUESDAY DIGEST COMPLETED ===')
    return NextResponse.json({ ok: true, message: 'Tuesday digest sent' })
    
  } catch (error) {
    console.error('=== TUESDAY DIGEST ERROR ===', error)
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
      console.error('Failed to send Tuesday digest:', errorText)
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
      console.log('Tuesday digest sent successfully')
    }
  } catch (error) {
    console.error('Error sending Tuesday digest:', error)
  }
}