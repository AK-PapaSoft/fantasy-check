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
        await sendMessage(telegramToken, chatId, '❌ **Формат команди:** `/link_sleeper <нікнейм>`\\n\\n📝 **Приклад:** `/link_sleeper Disgusting23`')
        return NextResponse.json({ ok: true })
      }
      
      const username = args[0].trim()
      
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        await sendMessage(telegramToken, chatId, '❌ **Помилка формату**\\n\\nНікнейм може містити лише:\\n• Латинські букви (a-z, A-Z)\\n• Цифри (0-9)\\n• Знак підкреслення (_)')
        return NextResponse.json({ ok: true })
      }
      
      await sendMessage(telegramToken, chatId, `🔍 Шукаю користувача **${username}** в Sleeper...`)
      try {
        // Direct Sleeper API call using the provided username
        const userResponse = await fetch(`https://api.sleeper.app/v1/user/${username}`)
        
        if (!userResponse.ok) {
          if (userResponse.status === 404) {
            await sendMessage(telegramToken, chatId, `❌ **Користувача не знайдено**\\n\\nКористувача "${username}" не існує в Sleeper.\\n\\n✅ **Перевірте:**\\n• Правильність написання нікнейму\\n• Чи існує такий профіль в Sleeper\\n\\n💡 **Підказка:** Нікнейм чутливий до регістру`)
            return NextResponse.json({ ok: true })
          }
          throw new Error(`HTTP ${userResponse.status}`)
        }
        
        const userData = await userResponse.json() as any
        
        if (!userData || !userData.user_id) {
          await sendMessage(telegramToken, chatId, `❌ **Помилка отримання даних**\\n\\nНе вдалося отримати інформацію про користувача "${username}".\\n\\nСпробуйте пізніше.`)
          return NextResponse.json({ ok: true })
        }
        
        // Get user's leagues for current season (2024)
        const leaguesResponse = await fetch(`https://api.sleeper.app/v1/user/${userData.user_id}/leagues/nfl/2024`)
        const leagues = leaguesResponse.ok ? await leaguesResponse.json() as any[] : []
        
        const displayName = userData.display_name || userData.username || username
        const avatar = userData.avatar ? `https://sleepercdn.com/avatars/thumbs/${userData.avatar}` : null
        
        let responseMessage = `✅ **Користувача знайдено!**\\n\\n👤 **Профіль:**\\n• Ім'я: ${displayName}\\n• ID: ${userData.user_id}`
        
        if (avatar) {
          responseMessage += `\\n• Аватар: [Переглянути](${avatar})`
        }
        
        if (leagues && leagues.length > 0) {
          responseMessage += `\\n\\n🏈 **Ліги NFL 2024 (${leagues.length}):**`
          leagues.slice(0, 5).forEach((league: any, index: number) => {
            responseMessage += `\\n${index + 1}. ${league.name}`
          })
          
          if (leagues.length > 5) {
            responseMessage += `\\n... і ще ${leagues.length - 5} ліг`
          }
        } else {
          responseMessage += `\\n\\n🏈 **Ліги NFL 2024:** Не знайдено`
        }
        
        responseMessage += `\\n\\n🔄 **Статус БД:** Тимчасово недоступна\\n💾 Дані не збережені, але перевірка профілю працює!\\n\\n💬 **Питання?** @anton_kravchuk23`
        
        await sendMessage(telegramToken, chatId, responseMessage)
        
      } catch (error) {
        console.error('Sleeper API error:', error)
        await sendMessage(telegramToken, chatId, `❌ **Помилка з'єднання**\\n\\nНе вдалося підключитися до Sleeper API.\\n\\n🔄 **Спробуйте:**\\n• Повторити через кілька хвилин\\n• Перевірити правильність нікнейму\\n\\n💬 **Проблеми?** @anton_kravchuk23`)
      }
    } else if (text === '/help') {
      const helpMessage = `🔧 **Fantasy Check - Довідка**

🏈 **Основні команди:**
• /start - Почати роботу з ботом
• /help - Показати цю довідку
• /link_sleeper <нік> - Підключити Sleeper профіль

🏆 **Управління лігами:**
• /leagues - Переглянути мої ліги
• /today - Дайджест на сьогодні

⚙️ **Налаштування:**
• /timezone - Змінити часовий пояс
• /lang - Змінити мову
• /feedback - Надіслати відгук

📱 **Бот працює на:** https://fantasy-check.vercel.app/

💬 **Підтримка:** @anton_kravchuk23`
      
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
    // Replace escaped newlines with actual newlines
    const cleanText = text.replace(/\\n/g, '\n')
    
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: cleanText,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      }),
    })
    
    if (!response.ok) {
      console.error('Failed to send message:', await response.text())
    } else {
      console.log('Message sent successfully')
    }
  } catch (error) {
    console.error('Error sending message:', error)
  }
}