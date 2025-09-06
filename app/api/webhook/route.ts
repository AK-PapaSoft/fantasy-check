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
    const { handleHelp } = await import('../../../src/bot/handlers/help').catch(() => ({ handleHelp: async (ctx: any) => ctx.reply('🔧 **Доступні команди:**\n• /start - Почати роботу\n• /help - Довідка\n• /link_sleeper <нік> - Підключити Sleeper') }))
    
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
    
    // Import other handlers with fallbacks
    const { handleLeagues, handleLeagueCallback } = await import('../../../src/bot/handlers/leagues').catch(() => ({ 
      handleLeagues: async (ctx: any) => ctx.reply('🏈 Функція ліг тимчасово недоступна'),
      handleLeagueCallback: async (ctx: any) => ctx.reply('Функція тимчасово недоступна')
    }))
    const { handleToday } = await import('../../../src/bot/handlers/today').catch(() => ({ handleToday: async (ctx: any) => ctx.reply('📊 Денний дайджест тимчасово недоступний') }))
    const { handleTimezone, handleTimezoneInput } = await import('../../../src/bot/handlers/timezone').catch(() => ({ 
      handleTimezone: async (ctx: any) => ctx.reply('🕐 Функція часового поясу тимчасово недоступна'),
      handleTimezoneInput: async (ctx: any) => {}
    }))
    const { handleFeedback, handleFeedbackMessage, isUserInFeedbackMode } = await import('../../../src/bot/handlers/feedback').catch(() => ({ 
      handleFeedback: async (ctx: any) => ctx.reply('💬 Для зв\'язку з розробниками напишіть: @ak_papasoft'),
      handleFeedbackMessage: async (ctx: any) => {},
      isUserInFeedbackMode: () => false
    }))
    const { handleLanguage } = await import('../../../src/bot/handlers/language').catch(() => ({ handleLanguage: async (ctx: any) => ctx.reply('🌐 Мова інтерфейсу: Українська') }))
    
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