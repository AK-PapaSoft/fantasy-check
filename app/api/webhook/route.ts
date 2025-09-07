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
    
    // Simplified link_sleeper handler without database
    const handleLinkSleeper = async (ctx: any) => {
      const message = ctx.message && 'text' in ctx.message ? ctx.message.text : ''
      const args = message.split(' ').slice(1)
      
      if (args.length === 0 || !args[0]) {
        await ctx.reply('❌ Формат команди: /link_sleeper <нікнейм>\n\nПриклад: /link_sleeper Disgusting23')
        return
      }
      
      const username = args[0].trim()
      
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        await ctx.reply('❌ Нікнейм може містити лише букви, цифри та знак підкреслення')
        return
      }
      
      await ctx.reply(`✅ Спробую підключити користувача "${username}"...\n\n🔄 База даних тимчасово недоступна. Розробники працюють над відновленням функціональності.\n\nПоки що можете скористатись командами:\n• /help - Довідка\n• /start - Перезапуск бота`)
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
      
      if (userId && isUserInFeedbackMode(userId)) {
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