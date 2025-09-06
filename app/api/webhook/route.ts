import { NextRequest, NextResponse } from 'next/server'
import { config } from 'dotenv'
import { TelegramBot } from '../../../src/bot'
import { connectDatabase } from '../../../src/db'
import pino from 'pino'

// Load environment variables
config()

const logger = pino({ 
  name: 'webhook-handler',
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
})

let telegramBot: TelegramBot | undefined
let isInitialized = false

async function initializeBot() {
  if (isInitialized) return telegramBot

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

    // Initialize Telegram bot
    const telegramToken = process.env.TELEGRAM_TOKEN!
    telegramBot = new TelegramBot(telegramToken)

    // Set webhook URL for production
    const webhookUrl = process.env.VERCEL_URL || process.env.APP_BASE_URL
    if (webhookUrl && process.env.NODE_ENV === 'production') {
      const fullWebhookUrl = webhookUrl.startsWith('http') ? webhookUrl : `https://${webhookUrl}`
      await telegramBot['bot'].telegram.setWebhook(`${fullWebhookUrl}/api/webhook`)
      logger.info('Webhook set successfully')
    }

    isInitialized = true
    logger.info('Bot initialized successfully')
    return telegramBot
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
    await bot['bot'].handleUpdate(body as any)
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error('Webhook handler error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}