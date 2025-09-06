import { NextRequest, NextResponse } from 'next/server'
import { config } from 'dotenv'
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

    // Get the job type from query parameter
    const { searchParams } = new URL(request.url)
    const jobType = searchParams.get('job')
    
    if (jobType === 'daily-digest') {
      logger.info('Daily digest job triggered via cron')
      return NextResponse.json({ success: true, job: jobType, message: 'Daily digest job triggered - implementation pending' })
    } else if (jobType === 'cache-refresh') {
      logger.info('Cache refresh job triggered via cron')
      return NextResponse.json({ success: true, job: jobType, message: 'Cache refresh job triggered - implementation pending' })
    } else {
      logger.warn(`Unknown job type: ${jobType}`)
      return NextResponse.json({ error: 'Unknown job type' }, { status: 400 })
    }

  } catch (error) {
    logger.error('Cron job error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}