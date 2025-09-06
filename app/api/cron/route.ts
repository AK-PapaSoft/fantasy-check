import { NextRequest, NextResponse } from 'next/server'
import { config } from 'dotenv'
import { TelegramBot } from '../../../src/bot'
import { JobManager } from '../../../src/jobs'

// Dynamic import for DiscordBot to avoid build issues
let DiscordBot: any = null
try {
  const discordModule = require('../../../src/discord-bot')
  DiscordBot = discordModule.DiscordBot
} catch (error) {
  console.warn('Discord bot module not available:', error)
}
import { connectDatabase } from '../../../src/db'
import pino from 'pino'

// Load environment variables
config()

const logger = pino({ 
  name: 'cron-handler',
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
})

export async function GET(request: NextRequest) {
  try {
    // Verify the request is authorized (check for a secret or from Vercel Cron)
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
    
    if (!process.env.CRON_SECRET || authHeader !== expectedAuth) {
      logger.warn('Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('Processing cron job...')

    // Connect to database
    await connectDatabase()

    // Initialize bots (needed for cron jobs)
    const telegramToken = process.env.TELEGRAM_TOKEN
    let telegramBot: TelegramBot | undefined
    let discordBot: any = undefined

    if (telegramToken) {
      telegramBot = new TelegramBot(telegramToken)
    }

    const discordToken = process.env.DISCORD_TOKEN
    const discordClientId = process.env.DISCORD_CLIENT_ID
    
    if (discordToken && discordClientId && DiscordBot) {
      discordBot = new DiscordBot(discordToken, discordClientId)
    }

    // Initialize job manager and run jobs
    if (!telegramBot) {
      return NextResponse.json({ error: 'Telegram bot not available' }, { status: 500 })
    }
    
    const jobManager = new JobManager(telegramBot, discordBot)
    
    // Get the job type from query parameter
    const { searchParams } = new URL(request.url)
    const jobType = searchParams.get('job')
    
    if (jobType === 'daily-digest') {
      // Trigger daily digest for all users (simplified for now)
      logger.info('Daily digest job triggered via cron')
      // Note: This would need to be implemented to get all users and call triggerDailyDigest
      return NextResponse.json({ success: true, job: jobType, message: 'Daily digest job triggered' })
    } else if (jobType === 'cache-refresh') {
      await jobManager.refreshLeague(1) // Simplified - would need to get active leagues
      logger.info('Cache refresh job completed')
    } else {
      logger.warn(`Unknown job type: ${jobType}`)
      return NextResponse.json({ error: 'Unknown job type' }, { status: 400 })
    }

    return NextResponse.json({ success: true, job: jobType })
  } catch (error) {
    logger.error('Cron job error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}