import { NextRequest, NextResponse } from 'next/server'
import { config } from 'dotenv'
import { Telegraf } from 'telegraf'
import { handleStart } from '../../../src/bot/handlers/start'
import { handleHelp } from '../../../src/bot/handlers/help'
import { handleLinkSleeper } from '../../../src/bot/handlers/link-sleeper'
import { handleLeagues, handleLeagueCallback } from '../../../src/bot/handlers/leagues'
import { handleToday } from '../../../src/bot/handlers/today'
import { handleTimezone, handleTimezoneInput } from '../../../src/bot/handlers/timezone'
import { handleFeedback, handleFeedbackMessage, isUserInFeedbackMode } from '../../../src/bot/handlers/feedback'
import { handleLanguage } from '../../../src/bot/handlers/language'
import { connectDatabase } from '../../../src/db'
import { t } from '../../../src/i18n'
import pino from 'pino'

// Load environment variables
config()

const logger = pino({ 
  name: 'webhook-handler-v3-' + Date.now(), // Force rebuild with timestamp
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
})

let bot: Telegraf | undefined
let isInitialized = false

async function initializeBot() {
  if (isInitialized) return bot

  try {
    logger.info('Initializing Telegram bot...')

    // Validate required environment variables
    const required = ['TELEGRAM_TOKEN']
    const missing = required.filter(key => !process.env[key])
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
    }

    // Try to connect to database
    try {
      await connectDatabase()
      logger.info('Database connected successfully')
    } catch (error) {
      logger.warn('Database connection failed:', error)
    }

    // Initialize Telegraf bot directly
    const telegramToken = process.env.TELEGRAM_TOKEN!
    bot = new Telegraf(telegramToken)
    
    // Set up handlers
    bot.command('start', handleStart)
    bot.command('help', handleHelp)
    bot.command('link_sleeper', handleLinkSleeper)
    bot.command('leagues', handleLeagues)
    bot.command('today', handleToday)
    bot.command('timezone', handleTimezone)
    bot.command('feedback', handleFeedback)
    bot.command('lang', handleLanguage)

    // Callback query handlers (inline buttons)
    bot.on('callback_query', handleLeagueCallback)

    // Text message handler (for timezone input and feedback)
    bot.on('text', async (ctx) => {
      const userId = ctx.from?.id
      
      // Check if user is in feedback mode first
      if (userId && isUserInFeedbackMode(userId)) {
        await handleFeedbackMessage(ctx)
        return
      }
      
      // Handle timezone input (only processes if user is in timezone flow)
      await handleTimezoneInput(ctx)
      
      // Note: Don't send help for every text message as it might be part of a flow
    })
    
    // Handle other message types
    bot.on('message', async (ctx) => {
      // This catches other types of messages that aren't handled above
      await ctx.reply(t('help'))
    })

    // Error handling
    bot.catch(async (err, ctx) => {
      logger.error({
        error: err,
        userId: ctx.from?.id,
        chatId: ctx.chat?.id,
        updateType: ctx.updateType,
      }, 'Bot error occurred')

      try {
        await ctx.reply(t('error_generic'))
      } catch (replyError) {
        logger.error('Failed to send error message to user:', replyError)
      }
    })

    isInitialized = true
    logger.info('Bot initialized successfully')
    return bot
  } catch (error) {
    logger.error('Failed to initialize bot:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const bot = await initializeBot()
    
    if (!bot) {
      return NextResponse.json({ error: 'Bot not initialized' }, { status: 500 })
    }

    logger.info('Processing Telegram webhook...')
    
    const body = await request.json()
    await bot.handleUpdate(body as any)
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error('Webhook handler error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}