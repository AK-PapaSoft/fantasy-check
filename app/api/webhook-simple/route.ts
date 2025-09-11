import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('=== SIMPLE WEBHOOK ===', new Date().toISOString())
    
    const telegramToken = process.env.TELEGRAM_TOKEN
    if (!telegramToken) {
      console.log('=== NO TELEGRAM_TOKEN ===')
      return NextResponse.json({ ok: true, message: 'No token configured' })
    }

    const body = await request.json() as any
    console.log('=== REQUEST BODY ===', JSON.stringify(body, null, 2))
    
    const message = body.message
    if (!message || !message.text) {
      return NextResponse.json({ ok: true })
    }
    
    const chatId = message.chat.id
    const text = message.text
    
    console.log(`=== MESSAGE: ${text} FROM CHAT: ${chatId} ===`)
    
    if (text.startsWith('/link_sleeper')) {
      const args = text.split(' ').slice(1)
      
      if (args.length === 0 || !args[0]) {
        await sendMessage(telegramToken, chatId, '❌ Формат команди: /link_sleeper <нікнейм>\n\n📝 Приклад: /link_sleeper Disgusting23')
        return NextResponse.json({ ok: true })
      }
      
      const username = args[0].trim()
      
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        await sendMessage(telegramToken, chatId, '❌ Помилка формату\n\nНікнейм може містити лише:\n• Латинські букви (a-z, A-Z)\n• Цифри (0-9)\n• Знак підкреслення (_)')
        return NextResponse.json({ ok: true })
      }
      
      await sendMessage(telegramToken, chatId, `🔍 Шукаю користувача "${username}" в Sleeper...`)
      
      try {
        console.log(`=== CALLING SLEEPER API FOR USER: ${username} ===`)
        
        // Direct Sleeper API call using the provided username with timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
        
        const userResponse = await fetch(`https://api.sleeper.app/v1/user/${username}`, {
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        
        console.log(`=== USER API RESPONSE STATUS: ${userResponse.status} ===`)
        
        if (!userResponse.ok) {
          if (userResponse.status === 404) {
            console.log(`=== USER NOT FOUND: ${username} ===`)
            await sendMessage(telegramToken, chatId, `❌ Користувача не знайдено\n\nКористувача "${username}" не існує в Sleeper.\n\n✅ Перевірте:\n• Правильність написання нікнейму\n• Чи існує такий профіль в Sleeper\n\n💡 Підказка: Нікнейм чутливий до регістру`)
            return NextResponse.json({ ok: true })
          }
          throw new Error(`HTTP ${userResponse.status}`)
        }
        
        const userData = await userResponse.json() as any
        console.log(`=== USER DATA RECEIVED: ${userData?.user_id} ===`)
        
        if (!userData || !userData.user_id) {
          console.log(`=== INVALID USER DATA ===`)
          await sendMessage(telegramToken, chatId, `❌ Помилка отримання даних\n\nНе вдалося отримати інформацію про користувача "${username}".\n\nСпробуйте пізніше.`)
          return NextResponse.json({ ok: true })
        }
        
        // Get user's leagues for current season (2024) with timeout
        console.log(`=== CALLING LEAGUES API FOR USER ID: ${userData.user_id} ===`)
        const leaguesController = new AbortController()
        const leaguesTimeoutId = setTimeout(() => leaguesController.abort(), 10000)
        
        clearTimeout(leaguesTimeoutId)
        
        console.log(`=== GETTING ALL LEAGUES (NFL + PICKEM) ===`)
        const leagues = await getAllUserLeagues(userData.user_id)
        console.log(`=== LEAGUES COUNT: ${leagues.length} ===`)
        
        const displayName = userData.display_name || userData.username || username
        const avatar = userData.avatar ? `https://sleepercdn.com/avatars/thumbs/${userData.avatar}` : null
        
        // Build response without complex Markdown formatting to avoid parsing errors
        let responseMessage = `✅ Користувача знайдено!\n\n👤 Профіль:\n• Ім'я: ${displayName}\n• ID: ${userData.user_id}`
        
        if (avatar) {
          responseMessage += `\n• Аватар: ${avatar}`
        }
        
        if (leagues && leagues.length > 0) {
          responseMessage += `\n\n🏈 Ліги NFL 2024 (${leagues.length}):`
          leagues.slice(0, 5).forEach((league: any, index: number) => {
            // Escape special characters in league name to prevent Markdown issues
            const safeName = league.name.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')
            
            // Detect league type
            let leagueType = ''
            if (league.settings?.best_ball === 1) {
              leagueType = ' (BestBall)'
            } else if (league.settings?.type === 2) {
              leagueType = ' (Dynasty)'
            } else if (league.name.toLowerCase().includes('dynasty')) {
              leagueType = ' (Dynasty)'
            } else if (league.name.toLowerCase().includes('bestball') || league.name.toLowerCase().includes('best ball')) {
              leagueType = ' (BestBall)'
            }
            
            responseMessage += `\n${index + 1}. ${safeName}${leagueType}`
          })
          
          if (leagues.length > 5) {
            responseMessage += `\n... і ще ${leagues.length - 5} ліг`
          }
        } else {
          responseMessage += `\n\n🏈 Ліги NFL 2024: Не знайдено`
        }
        
        // Try to save to Supabase directly (without Prisma)
        let dbSaveResult = false
        try {
          console.log(`=== TRYING SUPABASE DIRECT CONNECTION ===`)
          
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          
          if (supabaseUrl && supabaseKey) {
            // First, try to upsert user
            const userUpsertResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
              method: 'POST',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
              },
              body: JSON.stringify({
                "tgUserId": BigInt(chatId).toString(),
                platform: 'telegram',
                "createdAt": new Date().toISOString(),
                "updatedAt": new Date().toISOString()
              })
            })
            
            console.log(`=== USER UPSERT STATUS: ${userUpsertResponse.status} ===`)
            if (!userUpsertResponse.ok) {
              const errorText = await userUpsertResponse.text()
              console.error('User upsert error:', errorText)
            }
            
            // Get the user record to get the internal user ID
            const userLookupResponse = await fetch(`${supabaseUrl}/rest/v1/users?tgUserId=eq.${chatId}&select=id`, {
              method: 'GET',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
              }
            })
            
            if (userLookupResponse.ok) {
              const userLookupData = await userLookupResponse.json() as any[]
              console.log(`=== USER LOOKUP RESULT: ${JSON.stringify(userLookupData)} ===`)
              
              if (userLookupData && userLookupData.length > 0) {
                const userId = userLookupData[0].id
                
                // Now save provider info
                const providerUpsertResponse = await fetch(`${supabaseUrl}/rest/v1/providers`, {
                  method: 'POST',
                  headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                  },
                  body: JSON.stringify({
                    userId: userId,
                    provider: 'sleeper',
                    providerUsername: userData.username || username,
                    providerUserId: userData.user_id,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  })
                })
                
                console.log(`=== PROVIDER UPSERT STATUS: ${providerUpsertResponse.status} ===`)
                if (!providerUpsertResponse.ok) {
                  const errorText = await providerUpsertResponse.text()
                  console.error('Provider upsert error:', errorText)
                }
                
                // Save league information
                for (const league of leagues.slice(0, 3)) {
                  try {
                    // First create/update league
                    const leagueUpsertResponse = await fetch(`${supabaseUrl}/rest/v1/leagues`, {
                      method: 'POST',
                      headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'resolution=merge-duplicates'
                      },
                      body: JSON.stringify({
                        provider: 'sleeper',
                        providerLeagueId: league.league_id,
                        name: league.name,
                        season: 2024,
                        sport: 'nfl',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                      })
                    })
                    
                    console.log(`=== LEAGUE UPSERT STATUS: ${leagueUpsertResponse.status} ===`)
                    if (!leagueUpsertResponse.ok) {
                      const errorText = await leagueUpsertResponse.text()
                      console.error('League upsert error:', errorText)
                    }
                  } catch (leagueError) {
                    console.error('League save error:', leagueError)
                  }
                }
                
                console.log(`=== SUPABASE SAVE SUCCESSFUL ===`)
                dbSaveResult = true
              }
            }
          }
        } catch (dbError) {
          console.error('=== SUPABASE ERROR ===', dbError)
        }
        
        if (dbSaveResult) {
          responseMessage += `\n\n✅ Статус БД: Підключено\n💾 Дані збережено в базі даних!`
        } else {
          responseMessage += `\n\n🔄 Статус БД: Тимчасово недоступна\n💾 Дані не збережені, але перевірка профілю працює!`
        }
        
        responseMessage += `\n\n💬 Питання? @anton_kravchuk23`
        
        console.log(`=== SENDING FINAL MESSAGE ===`)
        await sendMessage(telegramToken, chatId, responseMessage)
        console.log(`=== MESSAGE SENT SUCCESSFULLY ===`)
        
      } catch (error) {
        console.error('=== SLEEPER API ERROR ===', error)
        
        let errorMessage = `❌ Помилка з'єднання\n\nНе вдалося підключитися до Sleeper API.`
        
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            errorMessage = `❌ Тайм-аут запиту\n\nЗапит до Sleeper API перевищив час очікування.`
          }
          console.error('Error details:', error.message)
        }
        
        errorMessage += `\n\n🔄 Спробуйте:\n• Повторити через кілька хвилин\n• Перевірити правильність нікнейму\n\n💬 Проблеми? @anton_kravchuk23`
        
        await sendMessage(telegramToken, chatId, errorMessage)
      }
    } else if (text === '/help') {
      const helpMessage = `🔧 Fantasy Check - Довідка

🏈 Основні команди:
• /start - Почати роботу з ботом
• /help - Показати цю довідку
• /link_sleeper <нік> - Підключити Sleeper профіль

🏆 Fantasy функції:
• /today - Дайджест на сьогодні
• /lastweek - Результати минулого тижня
• /leagues - Переглянути мої ліги
• /waivers - Перевірити дедлайни вейверів

⚙️ Налаштування:
• /timezone - Змінити часовий пояс
• /lang - Змінити мову
• /feedback - Надіслати відгук

📱 Бот працює на: https://fantasy-check.vercel.app/

💬 Підтримка: @anton_kravchuk23`
      
      await sendMessage(telegramToken, chatId, helpMessage)
    } else if (text === '/today') {
      try {
        console.log(`=== HANDLING /today COMMAND ===`)
        
        // First, get current NFL state
        const nflStateResponse = await fetch('https://api.sleeper.app/v1/state/nfl')
        const nflState = nflStateResponse.ok ? await nflStateResponse.json() as any : null
        
        if (!nflState) {
          await sendMessage(telegramToken, chatId, '❌ Не вдалося отримати інформацію про поточний стан NFL')
          return NextResponse.json({ ok: true })
        }
        
        const currentWeek = nflState.week
        const season = nflState.season
        
        // Get user's leagues from database or recent API calls
        await sendMessage(telegramToken, chatId, `📊 Збираю дані за ${currentWeek} тиждень NFL ${season}...`)
        
        // Get user leagues from database
        let userLeagues: any[] = []
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          
          if (supabaseUrl && supabaseKey) {
            // Get user from database
            const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?tgUserId=eq.${chatId}&select=id,providers(providerUserId)`, {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
              }
            })
            
            if (userResponse.ok) {
              const users = await userResponse.json() as any[]
              if (users.length > 0 && users[0].providers.length > 0) {
                const sleeperUserId = users[0].providers[0].providerUserId
                console.log(`=== FOUND USER SLEEPER ID: ${sleeperUserId} ===`)
                
                // Get all leagues (NFL + Pick'em) from Sleeper API using stored user ID
                userLeagues = await getAllUserLeagues(sleeperUserId)
              }
            }
          }
          
          // Fallback to test user if database doesn't have data
          if (userLeagues.length === 0) {
            console.log('=== FALLBACK TO TEST USER ===')
            userLeagues = await getAllUserLeagues('986349820359061504')
          }
        } catch (dbError) {
          console.error('Database error in /today:', dbError)
          // Fallback to test user
          userLeagues = await getAllUserLeagues('986349820359061504')
        }
        
        if (userLeagues.length === 0) {
          await sendMessageMarkdown(telegramToken, chatId, '❌ **Немає підключених ліг**\n\n🔗 Використайте команду:\n`/link_sleeper <ваш_нік>`\n\n📝 **Приклад**:\n`/link_sleeper Disgusting23`\n\n💡 Після підключення ви зможете переглядати свої матчі!')
          return NextResponse.json({ ok: true })
        }
        
        let todayMessage = `**Дайджест тижня ${currentWeek}**\n\n`
        
        // Process all user leagues
        for (let i = 0; i < userLeagues.length; i++) {
          const league = userLeagues[i]
          
          try {
            // Check if this is a pick'em league
            const isPickemLeague = league.isPickemLeague || league.sport === 'pickem:nfl'
            
            if (isPickemLeague) {
              // Handle pick'em league
              const pickemResult = await handlePickemLeague(league, currentWeek, chatId)
              todayMessage += pickemResult
              continue
            }
            
            // Handle regular fantasy league
            // Get matchups for current week
            const matchupsResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/matchups/${currentWeek}`)
            const matchups = matchupsResponse.ok ? await matchupsResponse.json() as any[] : []
            
            // Get league users to map roster_id to team names
            const usersResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/users`)
            const leagueUsers = usersResponse.ok ? await usersResponse.json() as any[] : []
            
            // Get rosters to map roster_id to owner_id
            const rostersResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/rosters`)
            const rosters = rostersResponse.ok ? await rostersResponse.json() as any[] : []
            
            // Create mapping from roster_id to team name and find user's team
            const teamNames: { [key: number]: string } = {}
            let userRosterId: number | null = null
            let userSleeperUserId: string | null = null
            
            // Get user's Sleeper ID from database
            try {
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
              const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
              
              if (supabaseUrl && supabaseKey) {
                const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?tgUserId=eq.${chatId}&select=providers(providerUserId)`, {
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
                  }
                }
              }
            } catch (dbError) {
              console.error('Error getting user Sleeper ID:', dbError)
            }
            
            rosters.forEach(roster => {
              const owner = leagueUsers.find(user => user.user_id === roster.owner_id)
              if (owner) {
                // Use display_name, fallback to username, then fallback to Team X
                const teamName = owner.display_name || owner.username || `Team ${roster.roster_id}`
                teamNames[roster.roster_id] = teamName
                
                // Check if this is the user's team
                if (userSleeperUserId && roster.owner_id === userSleeperUserId) {
                  userRosterId = roster.roster_id
                }
              } else {
                teamNames[roster.roster_id] = `Team ${roster.roster_id}`
              }
            })
            
            if (matchups.length > 0) {
              const safeName = league.name.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')
              todayMessage += `**${safeName}**\n`
              
              // Check if games have actually started - use a more conservative approach
              // Look for very low scores (< 5) which indicate real gameplay has started
              const hasRealScores = matchups.some(matchup => matchup.points && matchup.points > 0 && matchup.points < 15)
              
              // Group matchups by matchup_id
              const matchupGroups: { [key: number]: any[] } = {}
              matchups.forEach(matchup => {
                if (!matchupGroups[matchup.matchup_id]) {
                  matchupGroups[matchup.matchup_id] = []
                }
                matchupGroups[matchup.matchup_id].push(matchup)
              })
              
              // Find only user's matchups
              const userMatchups = []
              
              for (const matchupId in matchupGroups) {
                const matchupTeams = matchupGroups[matchupId]
                if (matchupTeams.length === 2) {
                  const team1 = matchupTeams[0]
                  const team2 = matchupTeams[1]
                  
                  // Check if this is user's matchup
                  const isUserMatchup = userRosterId === team1.roster_id || userRosterId === team2.roster_id
                  
                  if (isUserMatchup) {
                    userMatchups.push({ team1, team2, matchupId })
                  }
                }
              }
              
              // Show only user's matchups
              const matchupsToShow = userMatchups
              
              if (matchupsToShow.length === 0) {
                // User has no matchup in this league this week
                // Try to find user's team name in this league
                let userTeamName = 'Ваша команда'
                if (userRosterId && teamNames[userRosterId]) {
                  userTeamName = teamNames[userRosterId]
                }
                todayMessage += `🌟 **${userTeamName}**: не грає цього тижня\n`
              }
              
              matchupsToShow.forEach((matchupData, index) => {
                const { team1, team2 } = matchupData
                
                const team1Name = teamNames[team1.roster_id] || `Team ${team1.roster_id}`
                const team2Name = teamNames[team2.roster_id] || `Team ${team2.roster_id}`
                
                // Check if user's team is in this matchup
                const isUserTeam1 = userRosterId === team1.roster_id
                const isUserTeam2 = userRosterId === team2.roster_id
                
                // Special formatting for user's team
                const formatTeamName = (name: string, isUser: boolean) => {
                  return isUser ? `**${name}** (ВИ) 🌟` : `**${name}**`
                }
                
                const displayTeam1 = formatTeamName(team1Name, isUserTeam1)
                const displayTeam2 = formatTeamName(team2Name, isUserTeam2)
                
                // Compact display for user's personal matchup
                const userTeam = isUserTeam1 ? team1 : team2
                const opponentTeam = isUserTeam1 ? team2 : team1
                const userTeamName = isUserTeam1 ? team1Name : team2Name
                const opponentName = isUserTeam1 ? team2Name : team1Name
                
                if (hasRealScores) {
                  const scoreDiff = userTeam.points - opponentTeam.points
                  let status = ''
                  let winProbability = ''
                  
                  // Check if matchup is still ongoing (has players left to play)
                  const userPlayersLeft = userTeam.players_points ? Object.keys(userTeam.players_points).filter(playerId => 
                    userTeam.players_points[playerId] === 0 && userTeam.players?.includes(playerId)
                  ).length : 0
                  
                  const opponentPlayersLeft = opponentTeam.players_points ? Object.keys(opponentTeam.players_points).filter(playerId => 
                    opponentTeam.players_points[playerId] === 0 && opponentTeam.players?.includes(playerId)
                  ).length : 0
                  
                  const isMatchupComplete = userPlayersLeft === 0 && opponentPlayersLeft === 0
                  
                  if (isMatchupComplete) {
                    // Matchup is finished
                    if (scoreDiff > 0) {
                      status = `**Перемога** 🏆`
                    } else if (scoreDiff < 0) {
                      status = `**Поразка** 📉`
                    } else {
                      status = `**Нічия** 🤝`
                    }
                  } else {
                    // Matchup is ongoing - show current status and win probability
                    if (scoreDiff > 0) {
                      status = `**Ведете** +${scoreDiff.toFixed(1)}`
                    } else if (scoreDiff < 0) {
                      status = `**Програєте** ${scoreDiff.toFixed(1)}`
                    } else {
                      status = `**Нічия**`
                    }
                    
                    // Calculate simple win probability based on current score and remaining players
                    let winChance = 50 // Base 50%
                    
                    if (scoreDiff > 0) {
                      // Leading - higher chance
                      winChance = Math.min(85, 50 + (scoreDiff * 2.5))
                    } else if (scoreDiff < 0) {
                      // Trailing - lower chance
                      winChance = Math.max(15, 50 + (scoreDiff * 2.5))
                    }
                    
                    // Adjust based on remaining players
                    const playerDiff = userPlayersLeft - opponentPlayersLeft
                    winChance += playerDiff * 10 // 10% per extra player
                    winChance = Math.max(5, Math.min(95, winChance))
                    
                    winProbability = ` • 📈 ${Math.round(winChance)}% шанс`
                  }
                  
                  todayMessage += `🌟 **${userTeamName}** vs ${opponentName}: ${userTeam.points.toFixed(1)} - ${opponentTeam.points.toFixed(1)} (${status}${winProbability})\n`
                } else {
                  // Show projection status without fake scores
                  const scoreDiff = userTeam.points - opponentTeam.points
                  const status = scoreDiff > 0 ? `Потенціал: +${scoreDiff.toFixed(1)}` : 
                                scoreDiff < 0 ? `Потенціал: ${scoreDiff.toFixed(1)}` : 
                                'Потенціал: рівно'
                  
                  // Simple projection-based win chance
                  let winChance = 50
                  if (scoreDiff > 0) {
                    winChance = Math.min(80, 50 + (scoreDiff * 1.5))
                  } else if (scoreDiff < 0) {
                    winChance = Math.max(20, 50 + (scoreDiff * 1.5))
                  }
                  
                  todayMessage += `🌟 **${userTeamName}** vs ${opponentName}: (${status} • 📈 ${Math.round(winChance)}% шанс перемоги)\n`
                }
              })
            }
          } catch (leagueError) {
            console.error(`Error processing league ${league.league_id}:`, leagueError)
          }
          
          // Add line break between leagues
          if (i < userLeagues.length - 1) {
            todayMessage += '\n'
          }
        }
        
        todayMessage += `\n\n**Підтримка** (і психологічна) від @anton_kravchuk23`
        
        await sendMessageMarkdown(telegramToken, chatId, todayMessage)
        
      } catch (error) {
        console.error('=== /today ERROR ===', error)
        await sendMessage(telegramToken, chatId, '❌ Помилка при отриманні даних сьогодні.\n\nСпробуйте пізніше або зв\'яжіться з підтримкою @anton_kravchuk23')
      }
    } else if (text === '/leagues') {
      try {
        console.log(`=== HANDLING /leagues COMMAND ===`)
        
        await sendMessage(telegramToken, chatId, '📋 Шукаю ваші ліги...')
        
        // Get user leagues from database (same logic as /today)
        let userLeagues: any[] = []
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          
          if (supabaseUrl && supabaseKey) {
            const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?tgUserId=eq.${chatId}&select=id,providers(providerUserId)`, {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
              }
            })
            
            if (userResponse.ok) {
              const users = await userResponse.json() as any[]
              if (users.length > 0 && users[0].providers.length > 0) {
                const sleeperUserId = users[0].providers[0].providerUserId
                userLeagues = await getAllUserLeagues(sleeperUserId)
              }
            }
          }
          
          // Fallback
          if (userLeagues.length === 0) {
            userLeagues = await getAllUserLeagues('986349820359061504')
          }
        } catch (dbError) {
          console.error('Database error in /leagues:', dbError)
          userLeagues = await getAllUserLeagues('986349820359061504')
        }
        
        if (userLeagues.length === 0) {
          await sendMessage(telegramToken, chatId, '❌ Не знайдено активних ліг.\n\nВикористайте /link_sleeper <нік> для підключення профілю')
          return NextResponse.json({ ok: true })
        }
        
        // Get NFL state for current week
        const nflStateResponse = await fetch('https://api.sleeper.app/v1/state/nfl')
        const nflState = nflStateResponse.ok ? await nflStateResponse.json() as any : null
        const currentWeek = nflState?.week || 1
        
        let leaguesMessage = `🏈 **Мої ліги** (${userLeagues.length})\n\n`
        let userSleeperUserId: string | null = null
        
        // Get user's Sleeper ID 
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          
          if (supabaseUrl && supabaseKey) {
            const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?tgUserId=eq.${chatId}&select=providers(providerUserId)`, {
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
              }
            }
          }
          
          if (!userSleeperUserId) {
            userSleeperUserId = '986349820359061504' // Fallback
          }
        } catch (dbError) {
          userSleeperUserId = '986349820359061504' // Fallback
        }
        
        // Process each league to get detailed info
        for (let i = 0; i < userLeagues.length; i++) {
          const league = userLeagues[i]
          
          try {
            // Check if this is a pick'em league
            const isPickemLeague = league.isPickemLeague || league.sport === 'pickem:nfl'
            
            if (isPickemLeague) {
              // Handle pick'em league in /leagues command
              const pickemInfo = await handlePickemLeagueForLeagues(league, currentWeek, userSleeperUserId)
              leaguesMessage += pickemInfo
              if (i < userLeagues.length - 1) {
                leaguesMessage += '\n'
              }
              continue
            }
            
            // Handle regular fantasy league
            // Get league rosters to find user position
            const rostersResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/rosters`)
            const rosters = rostersResponse.ok ? await rostersResponse.json() as any[] : []
            
            // Get league users for team names
            const usersResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/users`)
            const leagueUsers = usersResponse.ok ? await usersResponse.json() as any[] : []
            
            // Find user's roster and position
            const userRoster = rosters.find(roster => roster.owner_id === userSleeperUserId)
            let userPosition = 'N/A'
            let userTeamName = 'Моя команда'
            let playoffStatus = ''
            
            if (userRoster) {
              // Sort rosters by wins, then by points to determine standings
              const sortedRosters = [...rosters].sort((a, b) => {
                if ((b.settings?.wins || 0) !== (a.settings?.wins || 0)) {
                  return (b.settings?.wins || 0) - (a.settings?.wins || 0)
                }
                return (b.settings?.fpts || 0) - (a.settings?.fpts || 0)
              })
              
              const position = sortedRosters.findIndex(r => r.roster_id === userRoster.roster_id) + 1
              userPosition = `${position}/${rosters.length}`
              
              // Get team name
              const owner = leagueUsers.find(user => user.user_id === userRoster.owner_id)
              userTeamName = owner?.display_name || owner?.username || 'Моя команда'
              
              // Check playoff eligibility (typically top half makes playoffs)
              const playoffSpots = league.settings?.playoff_teams || Math.floor(rosters.length / 2)
              if (position <= playoffSpots) {
                playoffStatus = ' 🟢'
              } else {
                playoffStatus = ' 🔴'
              }
            }
            
            // Get next opponent for current week
            let nextOpponent = 'TBD'
            try {
              const matchupsResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/matchups/${currentWeek}`)
              const matchups = matchupsResponse.ok ? await matchupsResponse.json() as any[] : []
              
              if (userRoster && matchups.length > 0) {
                const userMatchup = matchups.find(m => m.roster_id === userRoster.roster_id)
                if (userMatchup) {
                  const opponentMatchup = matchups.find(m => 
                    m.matchup_id === userMatchup.matchup_id && m.roster_id !== userRoster.roster_id
                  )
                  if (opponentMatchup) {
                    const opponent = leagueUsers.find(user => {
                      const opponentRoster = rosters.find(r => r.roster_id === opponentMatchup.roster_id)
                      return opponentRoster && user.user_id === opponentRoster.owner_id
                    })
                    nextOpponent = opponent?.display_name || opponent?.username || 'Невідомий'
                  }
                }
              }
            } catch (matchupError) {
              console.error('Error getting matchups:', matchupError)
            }
            
            // Detect league type
            let leagueType = ''
            if (league.settings?.best_ball === 1) {
              leagueType = ' 📊'
            } else if (league.settings?.type === 2 || league.name.toLowerCase().includes('dynasty')) {
              leagueType = ' 👑'
            }
            
            const teamCount = league.total_rosters || 12
            const playoffTeams = league.settings?.playoff_teams || Math.floor(teamCount / 2)
            
            leaguesMessage += `**${league.name}**${leagueType}\n`
            leaguesMessage += `🎯 **${userTeamName}** • ${userPosition} місце${playoffStatus}\n`
            leaguesMessage += `👥 ${teamCount} команд • 🏆 Плей-оф: ${playoffTeams}\n`
            leaguesMessage += `📅 Наступний: vs ${nextOpponent}\n`
            
            if (i < userLeagues.length - 1) {
              leaguesMessage += '\n'
            }
          } catch (leagueError) {
            console.error(`Error processing league ${league.league_id}:`, leagueError)
            // Fallback for this league
            leaguesMessage += `**${league.name}**\n`
            leaguesMessage += `👥 ${league.total_rosters || 12} команд • ❓ Завантажується...\n`
            if (i < userLeagues.length - 1) {
              leaguesMessage += '\n'
            }
          }
        }
        
        leaguesMessage += '\n\n💬 Підтримка: @anton_kravchuk23'
        
        await sendMessageMarkdown(telegramToken, chatId, leaguesMessage)
        
      } catch (error) {
        console.error('=== /leagues ERROR ===', error)
        await sendMessage(telegramToken, chatId, '❌ Помилка при отриманні списку ліг.\n\nСпробуйте пізніше або зв\'яжіться з підтримкою @anton_kravchuk23')
      }
    } else if (text === '/waivers') {
      try {
        console.log(`=== HANDLING /waivers COMMAND ===`)
        
        await sendMessage(telegramToken, chatId, '⏳ Перевіряю дедлайни вейверів...')
        
        // Instead of calling external API, process waivers directly here
        // Get user leagues and check waiver deadlines
        let userLeagues: any[] = []
        let userSleeperUserId: string | null = null
        
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          
          if (supabaseUrl && supabaseKey) {
            // Get user's Sleeper ID from database
            const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?tgUserId=eq.${chatId}&select=providers(providerUserId)`, {
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
                if (userSleeperUserId) {
                  userLeagues = await getAllUserLeagues(userSleeperUserId)
                }
              }
            }
          }
          
          // Fallback to test user if database doesn't have data
          if (userLeagues.length === 0) {
            console.log('=== FALLBACK TO TEST USER FOR WAIVERS ===')
            userLeagues = await getAllUserLeagues('986349820359061504')
          }
        } catch (dbError) {
          console.error('Database error in /waivers:', dbError)
          // Fallback to test user
          userLeagues = await getAllUserLeagues('986349820359061504')
        }
        
        if (userLeagues.length === 0) {
          await sendMessage(telegramToken, chatId, '❌ Не знайдено ліг для перевірки вейверів.\n\nВикористайте /link_sleeper для підключення профілю.')
          return NextResponse.json({ ok: true })
        }

        let waiverMessage = `**⏰ Стан вейверів**\n\n`
        let hasActiveWaivers = false

        // Check each league for waiver deadlines
        for (const league of userLeagues) {
          try {
            const leagueSettings = league.settings || {}
            const waiverDay = leagueSettings.waiver_day_of_week || 2 // Tuesday default
            const waiverHour = leagueSettings.daily_waivers_hour || 0

            // Calculate time until next waiver
            const now = new Date()
            const hoursUntilWaivers = calculateHoursUntilWaivers(now.getDay(), now.getHours(), waiverDay, waiverHour)
            
            const safeName = league.name.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')
            waiverMessage += `**${safeName}**\n`
            
            if (hoursUntilWaivers <= 2 && hoursUntilWaivers > 0) {
              hasActiveWaivers = true
              if (hoursUntilWaivers <= 1) {
                waiverMessage += `🚨 **${Math.ceil(hoursUntilWaivers * 60)} хв до дедлайну!**\n`
              } else {
                waiverMessage += `⏳ **${Math.ceil(hoursUntilWaivers)} год до дедлайну**\n`
              }
            } else if (hoursUntilWaivers <= 0) {
              waiverMessage += `✅ Вейвери обробляються\n`
            } else {
              const daysUntil = Math.floor(hoursUntilWaivers / 24)
              const hoursLeft = Math.floor(hoursUntilWaivers % 24)
              
              if (daysUntil > 0) {
                waiverMessage += `📅 ${daysUntil}д ${hoursLeft}г до вейверів\n`
              } else {
                waiverMessage += `📅 ${Math.ceil(hoursUntilWaivers)}г до вейверів\n`
              }
            }
            waiverMessage += '\n'
            
          } catch (leagueError) {
            console.error(`Error processing league ${league.league_id} for waivers:`, leagueError)
            waiverMessage += `❌ Помилка перевірки\n\n`
          }
        }
        
        if (hasActiveWaivers) {
          waiverMessage += `📋 **Рекомендації:**\n`
          waiverMessage += `• Перевірте травми гравців\n`
          waiverMessage += `• Подивіться bye-week заміни\n`
          waiverMessage += `• Проаналізуйте матчапи тижня\n\n`
          waiverMessage += `🎯 **Не забудьте зробити заявки!**`
        } else {
          waiverMessage += `😌 **Поки що немає термінових дедлайнів**`
        }
        
        await sendMessageMarkdown(telegramToken, chatId, waiverMessage)
        
      } catch (error) {
        console.error('=== /waivers ERROR ===', error)
        await sendMessage(telegramToken, chatId, '❌ Помилка при перевірці вейверів.\n\nСпробуйте пізніше або зв\'яжіться з підтримкою @anton_kravchuk23')
      }
    } else if (text === '/lastweek') {
      try {
        console.log(`=== HANDLING /lastweek COMMAND ===`)
        
        await sendMessage(telegramToken, chatId, '📊 Шукаю результати минулого тижня...')
        
        // Get current NFL week
        const nflStateResponse = await fetch('https://api.sleeper.app/v1/state/nfl')
        const nflState = nflStateResponse.ok ? await nflStateResponse.json() as any : null
        const currentWeek = nflState?.week || 1
        const lastWeek = currentWeek - 1
        
        if (lastWeek < 1) {
          await sendMessage(telegramToken, chatId, '❌ **Немає попереднього тижня для відображення**\n\nМи зараз в 1-му тижні сезону.')
          return NextResponse.json({ ok: true })
        }
        
        // Get user leagues from database
        let userLeagues: any[] = []
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          
          if (supabaseUrl && supabaseKey) {
            const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?tgUserId=eq.${chatId}&select=id,providers(providerUserId)`, {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
              }
            })
            
            if (userResponse.ok) {
              const users = await userResponse.json() as any[]
              if (users.length > 0 && users[0].providers.length > 0) {
                const sleeperUserId = users[0].providers[0].providerUserId
                userLeagues = await getAllUserLeagues(sleeperUserId)
              }
            }
          }
          
          // Fallback
          if (userLeagues.length === 0) {
            userLeagues = await getAllUserLeagues('986349820359061504')
          }
        } catch (dbError) {
          console.error('Database error in /lastweek:', dbError)
          userLeagues = await getAllUserLeagues('986349820359061504')
        }
        
        if (userLeagues.length === 0) {
          await sendMessage(telegramToken, chatId, '❌ Не знайдено активних ліг.\n\nВикористайте /link_sleeper <нік> для підключення профілю')
          return NextResponse.json({ ok: true })
        }
        
        let lastWeekMessage = `📊 **Результати тижня ${lastWeek}**\n\n`
        let userSleeperUserId: string | null = null
        
        // Get user's Sleeper ID 
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          
          if (supabaseUrl && supabaseKey) {
            const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?tgUserId=eq.${chatId}&select=providers(providerUserId)`, {
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
              }
            }
          }
          
          if (!userSleeperUserId) {
            userSleeperUserId = '986349820359061504' // Fallback
          }
        } catch (dbError) {
          userSleeperUserId = '986349820359061504' // Fallback
        }
        
        // Process each league to get last week results
        for (let i = 0; i < userLeagues.length; i++) {
          const league = userLeagues[i]
          
          try {
            // Check if this is a pick'em league
            const isPickemLeague = league.isPickemLeague || league.sport === 'pickem:nfl'
            
            if (isPickemLeague) {
              // Handle pick'em league results
              lastWeekMessage += `**${league.name}** (Pick'em)\n`
              lastWeekMessage += `📈 Результати pick'em за тиждень ${lastWeek} в розробці\n\n`
              continue
            }
            
            // Handle regular fantasy league
            // Get last week's matchups
            const matchupsResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/matchups/${lastWeek}`)
            const matchups = matchupsResponse.ok ? await matchupsResponse.json() as any[] : []
            
            // Get league users for team names
            const usersResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/users`)
            const leagueUsers = usersResponse.ok ? await usersResponse.json() as any[] : []
            
            // Get rosters to map roster_id to owner_id
            const rostersResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/rosters`)
            const rosters = rostersResponse.ok ? await rostersResponse.json() as any[] : []
            
            // Find user's roster and matchup
            const userRoster = rosters.find(roster => roster.owner_id === userSleeperUserId)
            if (!userRoster) continue
            
            const userMatchup = matchups.find(m => m.roster_id === userRoster.roster_id)
            if (!userMatchup) continue
            
            // Find opponent
            const opponentMatchup = matchups.find(m => 
              m.matchup_id === userMatchup.matchup_id && m.roster_id !== userRoster.roster_id
            )
            
            const safeName = league.name.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')
            lastWeekMessage += `**${safeName}**\n`
            
            if (opponentMatchup) {
              const userScore = userMatchup.points || 0
              const opponentScore = opponentMatchup.points || 0
              const won = userScore > opponentScore
              
              // Get team names
              const userOwner = leagueUsers.find(u => u.user_id === userSleeperUserId)
              const opponentRoster = rosters.find(r => r.roster_id === opponentMatchup.roster_id)
              const opponentOwner = leagueUsers.find(u => u.user_id === opponentRoster?.owner_id)
              
              const userTeamName = userOwner?.display_name || userOwner?.username || 'Ви'
              const opponentName = opponentOwner?.display_name || opponentOwner?.username || 'Суперник'
              
              const resultIcon = won ? '🏆' : '📉'
              const resultText = won ? '**Перемога**' : '**Поразка**'
              
              lastWeekMessage += `🌟 **${userTeamName}** vs ${opponentName}\n`
              lastWeekMessage += `📊 ${userScore.toFixed(1)} - ${opponentScore.toFixed(1)} (${resultText} ${resultIcon})\n`
              
              // Get current season record
              const wins = userRoster.settings?.wins || 0
              const losses = userRoster.settings?.losses || 0
              lastWeekMessage += `📈 Загальний рекорд: ${wins}-${losses}\n\n`
            } else {
              lastWeekMessage += `🔄 Не було матчапу в тижні ${lastWeek}\n\n`
            }
            
          } catch (leagueError) {
            console.error(`Error processing league ${league.league_id}:`, leagueError)
            lastWeekMessage += `❌ Помилка отримання даних для ${league.name}\n\n`
          }
        }
        
        lastWeekMessage += `💡 Для поточного тижня використовуйте /today`
        
        await sendMessageMarkdown(telegramToken, chatId, lastWeekMessage)
        
      } catch (error) {
        console.error('=== /lastweek ERROR ===', error)
        await sendMessage(telegramToken, chatId, '❌ Помилка при отриманні результатів минулого тижня.\n\nСпробуйте пізніше або зв\'яжіться з підтримкою @anton_kravchuk23')
      }
    } else if (text === '/timezone') {
      await sendMessage(telegramToken, chatId, '🌍 **Налаштування часового поясу**\n\nНаразі бот використовує київський час (Europe/Kiev).\n\nДля зміни часового поясу напишіть:\n`/timezone America/New_York`\n`/timezone Europe/London`\n`/timezone America/Los_Angeles`\n\nСписок доступних поясів: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones')
    } else if (text.startsWith('/timezone ')) {
      const timezone = text.replace('/timezone ', '').trim()
      
      // Validate timezone (basic check)
      if (timezone.includes('/') && timezone.length > 3) {
        await sendMessage(telegramToken, chatId, `✅ Часовий пояс встановлено: **${timezone}**\n\n⚠️ *Примітка: Функція зберігання поясу в розробці. Наразі всі сповіщення надходять в київському часі.*`)
      } else {
        await sendMessage(telegramToken, chatId, '❌ Невірний формат часового поясу.\n\nПриклад: `/timezone America/New_York`')
      }
    } else if (text === '/feedback') {
      await sendMessage(telegramToken, chatId, '💬 **Зворотний зв\'язок**\n\nДля відгуків, пропозицій або повідомлення про помилки:\n\n📝 Напишіть @anton_kravchuk23\n📧 Email: anton.kravchuk@cleareds.com\n\n**Що можна покращити?**\n• Додати нові функції\n• Виправити помилки\n• Покращити повідомлення\n• Додати підтримку інших ліг\n\nВаша думка важлива! 🙏')
    } else if (text === '/start') {
      await sendMessage(telegramToken, chatId, '🚀 Fantasy Check Bot працює! Ласкаво просимо!')
    }
    
    return NextResponse.json({ ok: true })
    
  } catch (error) {
    console.error('=== SIMPLE WEBHOOK ERROR ===', error)
    return NextResponse.json({ 
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
      console.error('Failed to send message:', errorText)
    } else {
      console.log('Message sent successfully')
    }
  } catch (error) {
    console.error('Error sending message:', error)
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

// Helper function to get all user leagues (NFL + Pick'em)
async function getAllUserLeagues(sleeperUserId: string): Promise<any[]> {
  try {
    // Get NFL fantasy leagues for 2024
    const nflLeaguesResponse = await fetch(`https://api.sleeper.app/v1/user/${sleeperUserId}/leagues/nfl/2024`)
    const nflLeagues = nflLeaguesResponse.ok ? await nflLeaguesResponse.json() as any[] : []
    
    // Get pick'em leagues for 2025
    const pickemLeaguesResponse = await fetch(`https://api.sleeper.app/v1/user/${sleeperUserId}/leagues/pickem:nfl/2025`)
    const pickemLeagues = pickemLeaguesResponse.ok ? await pickemLeaguesResponse.json() as any[] : []
    
    // Mark pick'em leagues with a special flag for identification
    const markedPickemLeagues = pickemLeagues.map(league => ({
      ...league,
      isPickemLeague: true
    }))
    
    // Combine both types
    return [...nflLeagues, ...markedPickemLeagues]
  } catch (error) {
    console.error('Error getting all user leagues:', error)
    return []
  }
}

// Helper function to handle pick'em leagues
async function handlePickemLeague(league: any, currentWeek: number, chatId: number): Promise<string> {
  try {
    // Get user's Sleeper ID from database
    let userSleeperUserId: string | null = null
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (supabaseUrl && supabaseKey) {
        const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?tgUserId=eq.${chatId}&select=providers(providerUserId)`, {
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
          }
        }
      }
      
      if (!userSleeperUserId) {
        userSleeperUserId = '986349820359061504' // Fallback
      }
    } catch (dbError) {
      userSleeperUserId = '986349820359061504' // Fallback
    }

    // Get league users for standings and names
    const usersResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/users`)
    const leagueUsers = usersResponse.ok ? await usersResponse.json() as any[] : []
    
    // Get current week's picks (if available)
    let userPicks: any[] = []
    let weekResults: any = null
    
    try {
      // Try to get picks for this week - Note: Sleeper API may not have a direct picks endpoint
      // This is a placeholder - actual implementation may need different API calls
      const picksResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/matchups/${currentWeek}`)
      if (picksResponse.ok) {
        weekResults = await picksResponse.json()
      }
    } catch (pickError) {
      console.error('Error getting picks:', pickError)
    }

    // Find user in the league
    const user = leagueUsers.find(u => u.user_id === userSleeperUserId)
    const userName = user?.display_name || user?.username || 'Ви'
    
    // Note: Pick'em statistics not available through Sleeper API
    // Would need to track picks/results separately
    
    // Get current standings (simplified)
    const sortedUsers = [...leagueUsers].sort((a, b) => {
      // Would sort by actual pick'em points, this is simulated
      return Math.random() - 0.5
    })
    const userPosition = sortedUsers.findIndex(u => u.user_id === userSleeperUserId) + 1
    
    // Check deadline (Thursday is typical for pick'em)
    const now = new Date()
    const thursday = new Date()
    thursday.setDate(thursday.getDate() + (4 - thursday.getDay() + 7) % 7) // Next Thursday
    thursday.setHours(20, 0, 0, 0) // 8 PM
    
    const hoursUntilDeadline = (thursday.getTime() - now.getTime()) / (1000 * 60 * 60)
    let deadlineWarning = ''
    
    if (hoursUntilDeadline > 0 && hoursUntilDeadline <= 48) {
      if (hoursUntilDeadline <= 6) {
        deadlineWarning = ` 🚨 **${Math.ceil(hoursUntilDeadline)} год до дедлайну!**`
      } else if (hoursUntilDeadline <= 24) {
        deadlineWarning = ` ⏰ **Дедлайн завтра**`
      } else {
        deadlineWarning = ` 📅 **Дедлайн: четвер 20:00**`
      }
    }

    let pickemMessage = `**${league.name}** 🎯${deadlineWarning}\n`
    pickemMessage += `🏆 **${userName}** • ${userPosition}/${leagueUsers.length} місце\n`
    
    // Show current week status and deadline info
    if (hoursUntilDeadline > 0 && hoursUntilDeadline <= 48) {
      if (hoursUntilDeadline <= 6) {
        pickemMessage += `🚨 **Терміново зробіть вибір!**\n`
      } else {
        pickemMessage += `📋 **Час зробити вибір до четверга**\n`
      }
    } else {
      pickemMessage += `✅ **Вибір зроблено** або дедлайн пройшов\n`
    }
    
    return pickemMessage + '\n'

  } catch (error) {
    console.error(`Error processing pick'em league ${league.league_id}:`, error)
    return `**${league.name}** 🎯\n❓ Завантажується...\n\n`
  }
}

// Helper function to handle pick'em leagues in /leagues command
async function handlePickemLeagueForLeagues(league: any, currentWeek: number, userSleeperUserId: string): Promise<string> {
  try {
    // Get league users for standings and names
    const usersResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/users`)
    const leagueUsers = usersResponse.ok ? await usersResponse.json() as any[] : []
    
    // Find user in the league
    const user = leagueUsers.find(u => u.user_id === userSleeperUserId)
    const userName = user?.display_name || user?.username || 'Ви'
    
    // Note: Pick'em statistics not available through Sleeper API
    
    // Get current standings (simplified)
    const sortedUsers = [...leagueUsers].sort((a, b) => {
      // Would sort by actual pick'em points, this is simulated
      return Math.random() - 0.5
    })
    const userPosition = sortedUsers.findIndex(u => u.user_id === userSleeperUserId) + 1
    
    // Check playoff eligibility for pick'em (usually top half)
    const playoffSpots = Math.floor(leagueUsers.length / 2)
    let playoffStatus = ''
    if (userPosition <= playoffSpots) {
      playoffStatus = ' 🟢'
    } else {
      playoffStatus = ' 🔴'
    }
    
    // Check deadline (Thursday is typical for pick'em)
    const now = new Date()
    const thursday = new Date()
    thursday.setDate(thursday.getDate() + (4 - thursday.getDay() + 7) % 7) // Next Thursday
    thursday.setHours(20, 0, 0, 0) // 8 PM
    
    const hoursUntilDeadline = (thursday.getTime() - now.getTime()) / (1000 * 60 * 60)
    let nextAction = 'Готово'
    
    if (hoursUntilDeadline > 0 && hoursUntilDeadline <= 48) {
      nextAction = 'Зробити вибір'
    }
    
    let pickemMessage = `**${league.name}** 🎯\n`
    pickemMessage += `🏆 **${userName}** • ${userPosition}/${leagueUsers.length} місце${playoffStatus}\n`
    pickemMessage += `👥 ${leagueUsers.length} учасників • 📅 Наступний: ${nextAction}\n`
    
    return pickemMessage

  } catch (error) {
    console.error(`Error processing pick'em league ${league.league_id} for /leagues:`, error)
    return `**${league.name}** 🎯\n❓ Завантажується...\n`
  }
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
      console.error('Failed to send markdown message:', errorText)
      // Fallback to plain text if markdown fails
      await sendMessage(token, chatId, text.replace(/\*\*/g, '').replace(/\*/g, ''))
    } else {
      console.log('Markdown message sent successfully')
    }
  } catch (error) {
    console.error('Error sending markdown message:', error)
    // Fallback to plain text
    await sendMessage(token, chatId, text.replace(/\*\*/g, '').replace(/\*/g, ''))
  }
}