import { NextRequest, NextResponse } from 'next/server'
import { Telegraf } from 'telegraf'

export async function POST(request: NextRequest) {
  try {
    console.log('=== WEBHOOK RECEIVED ===', new Date().toISOString())
    
    const telegramToken = process.env.TELEGRAM_TOKEN
    if (!telegramToken) {
      console.log('=== NO TELEGRAM_TOKEN ===')
      return NextResponse.json({ ok: true, message: 'No token configured' })
    }

    // Initialize Telegraf bot
    const bot = new Telegraf(telegramToken)
    
    // Import handlers - with fallbacks for database connection issues
    const { handleStart } = await import('../../../src/bot/handlers/start').catch(() => ({ handleStart: async (ctx: any) => ctx.reply('🚀 Fantasy Check Bot працює! Ласкаво просимо!') }))
    const { handleHelp } = await import('../../../src/bot/handlers/help')
    
    // Working link_sleeper handler with direct Sleeper API integration
    const handleLinkSleeper = async (ctx: any) => {
      const message = ctx.message && 'text' in ctx.message ? ctx.message.text : ''
      const args = message.split(' ').slice(1)
      
      if (args.length === 0 || !args[0]) {
        await ctx.reply('❌ **Формат команди:** `/link_sleeper <нікнейм>`\n\n📝 **Приклад:** `/link_sleeper Disgusting23`', { parse_mode: 'Markdown' })
        return
      }
      
      const username = args[0].trim()
      
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        await ctx.reply('❌ **Помилка формату**\n\nНікнейм може містити лише:\n• Латинські букви (a-z, A-Z)\n• Цифри (0-9)\n• Знак підкреслення (_)', { parse_mode: 'Markdown' })
        return
      }
      
      await ctx.reply(`🔍 Шукаю користувача **${username}** в Sleeper...`, { parse_mode: 'Markdown' })
      
      try {
        // Direct Sleeper API call
        const userResponse = await fetch(`https://api.sleeper.app/v1/user/${username}`)
        
        if (!userResponse.ok) {
          if (userResponse.status === 404) {
            await ctx.reply(`❌ **Користувача не знайдено**\n\nКористувача "${username}" не існує в Sleeper.\n\n✅ **Перевірте:**\n• Правильність написання нікнейму\n• Чи існує такий профіль в Sleeper\n\n💡 **Підказка:** Нікнейм чутливий до регістру`, { parse_mode: 'Markdown' })
            return
          }
          throw new Error(`HTTP ${userResponse.status}`)
        }
        
        const userData = await userResponse.json()
        
        if (!userData || !userData.user_id) {
          await ctx.reply(`❌ **Помилка отримання даних**\n\nНе вдалося отримати інформацію про користувача "${username}".\n\nСпробуйте пізніше.`, { parse_mode: 'Markdown' })
          return
        }
        
        // Get user's leagues for current season (2024)
        const leaguesResponse = await fetch(`https://api.sleeper.app/v1/user/${userData.user_id}/leagues/nfl/2024`)
        const leagues = leaguesResponse.ok ? await leaguesResponse.json() : []
        
        const displayName = userData.display_name || userData.username || username
        const avatar = userData.avatar ? `https://sleepercdn.com/avatars/thumbs/${userData.avatar}` : null
        
        let responseMessage = `✅ **Користувача знайдено!**\n\n👤 **Профіль:**\n• Ім'я: ${displayName}\n• ID: ${userData.user_id}`
        
        if (avatar) {
          responseMessage += `\n• Аватар: [Переглянути](${avatar})`
        }
        
        if (leagues && leagues.length > 0) {
          responseMessage += `\n\n🏈 **Ліги NFL 2024 (${leagues.length}):**`
          leagues.slice(0, 5).forEach((league: any, index: number) => {
            responseMessage += `\n${index + 1}. ${league.name}`
          })
          
          if (leagues.length > 5) {
            responseMessage += `\n... і ще ${leagues.length - 5} ліг`
          }
        } else {
          responseMessage += `\n\n🏈 **Ліги NFL 2024:** Не знайдено`
        }
        
        responseMessage += `\n\n🔄 **Статус БД:** Тимчасово недоступна\n💾 Дані не збережені, але перевірка профілю працює!\n\n💬 **Питання?** @ak_papasoft`
        
        await ctx.reply(responseMessage, { 
          parse_mode: 'Markdown',
          disable_web_page_preview: true 
        })
        
      } catch (error) {
        console.error('Sleeper API error:', error)
        await ctx.reply(`❌ **Помилка з'єднання**\n\nНе вдалося підключитися до Sleeper API.\n\n🔄 **Спробуйте:**\n• Повторити через кілька хвилин\n• Перевірити правильність нікнейму\n\n💬 **Проблеми?** @ak_papasoft`, { parse_mode: 'Markdown' })
      }
    }
    
    // Improved fallback handlers
    const handleLeagues = async (ctx: any) => {
      await ctx.reply('🏈 **Мої ліги**\n\n🔄 Функція ліг тимчасово недоступна через проблеми з базою даних.\n\n📝 **Що можете зробити:**\n• Спочатку використайте /link_sleeper <нік> для підключення профілю\n• Після відновлення БД ваші ліги автоматично завантажяться\n\n💬 **Питання?** Пишіть @ak_papasoft', { parse_mode: 'Markdown' })
    }
    
    const handleLeagueCallback = async (ctx: any) => {
      await ctx.reply('🔄 Функція тимчасово недоступна')
    }
    
    const handleToday = async (ctx: any) => {
      const todayMessage = `📊 **Дайджест на сьогодні**

🗓️ **${new Date().toLocaleDateString('uk-UA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}**

🔄 Функція дайджесту тимчасово недоступна через проблеми з базою даних.

🏈 **Що буде доступно після відновлення:**
• Аналіз стартового складу
• Інформація про травми гравців
• Рекомендації щодо заміни гравців
• Статистика опонентів

💡 **Підказка:** Використайте /link_sleeper для підключення профілю, щоб після відновлення отримувати персоналізовані дайджести.

💬 **Питання?** @ak_papasoft`
      
      await ctx.reply(todayMessage, { parse_mode: 'Markdown' })
    }
    
    const handleTimezone = async (ctx: any) => {
      await ctx.reply('🕐 **Налаштування часового поясу**\n\n🔄 Функція тимчасово недоступна.\n\n📍 **Поточний пояс:** Europe/Kiev (UTC+2)\n\n💬 **Потрібна допомога?** @ak_papasoft', { parse_mode: 'Markdown' })
    }
    
    const handleTimezoneInput = async (ctx: any) => {
      // Silent fallback for timezone input
    }
    
    const handleFeedback = async (ctx: any) => {
      await ctx.reply('💬 **Зв\'язок з розробниками**\n\n📩 Для відгуків, пропозицій або звітів про помилки пишіть напряму: @ak_papasoft\n\n🔧 **Що можете повідомити:**\n• Помилки в роботі бота\n• Ідеї для покращення\n• Проблеми з командами\n• Пропозиції нових функцій\n\n⚡ Ми намагаємося відповісти протягом доби!', { parse_mode: 'Markdown' })
    }
    
    const handleFeedbackMessage = async (ctx: any) => {
      // Silent fallback
    }
    
    const isUserInFeedbackMode = () => false
    
    const handleLanguage = async (ctx: any) => {
      await ctx.reply('🌐 **Мова інтерфейсу**\n\n🇺🇦 Поточна мова: **Українська**\n\n🔄 Функція зміни мови тимчасово недоступна.\n\n💡 **Підтримуються мови:**\n• 🇺🇦 Українська\n• 🇺🇸 English\n\n💬 **Потрібна допомога?** @ak_papasoft', { parse_mode: 'Markdown' })
    }
    
    // Setup command handlers
    bot.command('start', handleStart)
    bot.command('help', handleHelp)
    bot.command('link_sleeper', handleLinkSleeper)
    bot.command('leagues', handleLeagues)
    bot.command('today', handleToday)
    bot.command('timezone', handleTimezone)
    bot.command('feedback', handleFeedback)
    bot.command('lang', handleLanguage)

    // Setup callback query handler for inline buttons
    bot.on('callback_query', handleLeagueCallback)

    // Setup text message handler
    bot.on('text', async (ctx) => {
      const userId = ctx.from?.id
      
      if (userId && isUserInFeedbackMode()) {
        await handleFeedbackMessage(ctx)
        return
      }
      
      await handleTimezoneInput(ctx)
    })

    // Handle unknown commands
    bot.on('message', async (ctx) => {
      if (ctx.message && 'text' in ctx.message && ctx.message.text.startsWith('/')) {
        await ctx.reply('❌ Невідома команда\n\nВикористай /help для списку команд.')
      }
    })

    // Error handling
    bot.catch(async (err, ctx) => {
      console.error('=== BOT ERROR ===', err)
      try {
        await ctx.reply('❌ Сталася помилка. Спробуйте пізніше.')
      } catch (replyError) {
        console.error('Failed to send error message:', replyError)
      }
    })
    
    // Get request body
    const body = await request.json() as any
    console.log('=== PROCESSING UPDATE ===', JSON.stringify(body, null, 2))
    
    // Process the update
    await bot.handleUpdate(body)
    
    return NextResponse.json({ ok: true })
    
  } catch (error) {
    console.error('=== WEBHOOK ERROR ===', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}