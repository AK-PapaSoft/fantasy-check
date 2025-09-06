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
    
    // Import handlers
    const { handleStart } = await import('../../../src/bot/handlers/start')
    const { handleHelp } = await import('../../../src/bot/handlers/help')
    const { handleLinkSleeper } = await import('../../../src/bot/handlers/link-sleeper')
    const { handleLeagues, handleLeagueCallback } = await import('../../../src/bot/handlers/leagues')
    const { handleToday } = await import('../../../src/bot/handlers/today')
    const { handleTimezone, handleTimezoneInput } = await import('../../../src/bot/handlers/timezone')
    const { handleFeedback, handleFeedbackMessage, isUserInFeedbackMode } = await import('../../../src/bot/handlers/feedback')
    const { handleLanguage } = await import('../../../src/bot/handlers/language')
    const { t } = await import('../../../src/i18n')
    
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
        await ctx.reply(t('error_generic') + '\n\nВикористай /help для списку команд.')
      }
    })

    // Error handling
    bot.catch(async (err, ctx) => {
      console.error('=== BOT ERROR ===', err)
      try {
        await ctx.reply(t('error_generic'))
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