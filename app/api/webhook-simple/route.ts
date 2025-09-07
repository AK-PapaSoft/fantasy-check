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
              const userLookupData = await userLookupResponse.json()
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