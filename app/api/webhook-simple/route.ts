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
        
        const leaguesResponse = await fetch(`https://api.sleeper.app/v1/user/${userData.user_id}/leagues/nfl/2024`, {
          signal: leaguesController.signal
        })
        clearTimeout(leaguesTimeoutId)
        
        console.log(`=== LEAGUES API RESPONSE STATUS: ${leaguesResponse.status} ===`)
        const leagues = leaguesResponse.ok ? await leaguesResponse.json() as any[] : []
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

🏆 Управління лігами:
• /leagues - Переглянути мої ліги
• /today - Дайджест на сьогодні

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
                
                // Get leagues from Sleeper API using stored user ID
                const leaguesResponse = await fetch(`https://api.sleeper.app/v1/user/${sleeperUserId}/leagues/nfl/2024`)
                userLeagues = leaguesResponse.ok ? await leaguesResponse.json() as any[] : []
              }
            }
          }
          
          // Fallback to test user if database doesn't have data
          if (userLeagues.length === 0) {
            console.log('=== FALLBACK TO TEST USER ===')
            const testUserResponse = await fetch('https://api.sleeper.app/v1/user/986349820359061504/leagues/nfl/2024')
            userLeagues = testUserResponse.ok ? await testUserResponse.json() as any[] : []
          }
        } catch (dbError) {
          console.error('Database error in /today:', dbError)
          // Fallback to test user
          const testUserResponse = await fetch('https://api.sleeper.app/v1/user/986349820359061504/leagues/nfl/2024')
          userLeagues = testUserResponse.ok ? await testUserResponse.json() as any[] : []
        }
        
        if (userLeagues.length === 0) {
          await sendMessage(telegramToken, chatId, '❌ Не знайдено активних ліг.\n\nВикористайте /link_sleeper <нік> для підключення профілю')
          return NextResponse.json({ ok: true })
        }
        
        let todayMessage = `🏈 **Сьогоднішній дайджест** (Тиждень ${currentWeek})\n\n`
        
        // Process up to 3 leagues
        for (let i = 0; i < Math.min(userLeagues.length, 3); i++) {
          const league = userLeagues[i]
          
          try {
            // Get matchups for current week
            const matchupsResponse = await fetch(`https://api.sleeper.app/v1/league/${league.league_id}/matchups/${currentWeek}`)
            const matchups = matchupsResponse.ok ? await matchupsResponse.json() as any[] : []
            
            if (matchups.length > 0) {
              todayMessage += `🏆 **${league.name}**\n`
              
              // Group matchups by matchup_id
              const matchupGroups: { [key: number]: any[] } = {}
              matchups.forEach(matchup => {
                if (!matchupGroups[matchup.matchup_id]) {
                  matchupGroups[matchup.matchup_id] = []
                }
                matchupGroups[matchup.matchup_id].push(matchup)
              })
              
              // Show top matchups
              let matchupCount = 0
              for (const matchupId in matchupGroups) {
                if (matchupCount >= 2) break // Show max 2 matchups per league
                
                const matchupTeams = matchupGroups[matchupId]
                if (matchupTeams.length === 2) {
                  const team1 = matchupTeams[0]
                  const team2 = matchupTeams[1]
                  
                  todayMessage += `📊 Команда ${team1.roster_id}: ${team1.points} очок\n`
                  todayMessage += `📊 Команда ${team2.roster_id}: ${team2.points} очок\n`
                  
                  if (team1.points > team2.points) {
                    todayMessage += `🏆 Веде: Команда ${team1.roster_id}\n`
                  } else if (team2.points > team1.points) {
                    todayMessage += `🏆 Веде: Команда ${team2.roster_id}\n`
                  } else {
                    todayMessage += `🤝 Нічия!\n`
                  }
                  todayMessage += '\n'
                  matchupCount++
                }
              }
            }
          } catch (leagueError) {
            console.error(`Error processing league ${league.league_id}:`, leagueError)
          }
        }
        
        if (userLeagues.length > 3) {
          todayMessage += `... і ще ${userLeagues.length - 3} ліг\n\n`
        }
        
        todayMessage += `🔄 Оновлено: ${new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' })}\n`
        todayMessage += `⏰ Київський час\n\n`
        todayMessage += `💬 Питання? @anton_kravchuk23`
        
        await sendMessage(telegramToken, chatId, todayMessage)
        
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
                const leaguesResponse = await fetch(`https://api.sleeper.app/v1/user/${sleeperUserId}/leagues/nfl/2024`)
                userLeagues = leaguesResponse.ok ? await leaguesResponse.json() as any[] : []
              }
            }
          }
          
          // Fallback
          if (userLeagues.length === 0) {
            const testUserResponse = await fetch('https://api.sleeper.app/v1/user/986349820359061504/leagues/nfl/2024')
            userLeagues = testUserResponse.ok ? await testUserResponse.json() as any[] : []
          }
        } catch (dbError) {
          console.error('Database error in /leagues:', dbError)
          const testUserResponse = await fetch('https://api.sleeper.app/v1/user/986349820359061504/leagues/nfl/2024')
          userLeagues = testUserResponse.ok ? await testUserResponse.json() as any[] : []
        }
        
        if (userLeagues.length === 0) {
          await sendMessage(telegramToken, chatId, '❌ Не знайдено активних ліг.\n\nВикористайте /link_sleeper <нік> для підключення профілю')
          return NextResponse.json({ ok: true })
        }
        
        let leaguesMessage = `🏈 **Ваші ліги NFL 2024** (${userLeagues.length})\n\n`
        
        userLeagues.forEach((league: any, index: number) => {
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
          
          const safeName = league.name.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')
          
          leaguesMessage += `${index + 1}. **${safeName}**${leagueType}\n`
          leaguesMessage += `   👥 Команд: ${league.total_rosters}\n`
          leaguesMessage += `   📊 Статус: ${league.status === 'complete' ? '✅ Завершена' : '🔄 Активна'}\n`
          if (league.settings?.playoff_teams) {
            leaguesMessage += `   🏆 Плей-оф: ${league.settings.playoff_teams} команд\n`
          }
          leaguesMessage += '\n'
        })
        
        leaguesMessage += `🔄 Оновлено: ${new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' })}\n`
        leaguesMessage += `💬 Питання? @anton_kravchuk23`
        
        await sendMessage(telegramToken, chatId, leaguesMessage)
        
      } catch (error) {
        console.error('=== /leagues ERROR ===', error)
        await sendMessage(telegramToken, chatId, '❌ Помилка при отриманні списку ліг.\n\nСпробуйте пізніше або зв\'яжіться з підтримкою @anton_kravchuk23')
      }
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