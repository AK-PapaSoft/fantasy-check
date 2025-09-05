import { VercelRequest, VercelResponse } from '@vercel/node';
import { config } from 'dotenv';
import { TelegramBot } from '../src/bot';
import { DiscordBot } from '../src/discord-bot';
import { JobManager } from '../src/jobs';
import { connectDatabase } from '../src/db';
import pino from 'pino';

// Load environment variables
config();

const logger = pino({ 
  name: 'cron-handler',
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Verify the request is authorized (check for a secret or from Vercel Cron)
    const authHeader = req.headers.authorization;
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    if (!process.env.CRON_SECRET || authHeader !== expectedAuth) {
      logger.warn('Unauthorized cron request');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    logger.info('Processing cron job...');

    // Connect to database
    await connectDatabase();

    // Initialize bots (needed for cron jobs)
    const telegramToken = process.env.TELEGRAM_TOKEN;
    let telegramBot: TelegramBot | undefined;
    let discordBot: DiscordBot | undefined;

    if (telegramToken) {
      telegramBot = new TelegramBot(telegramToken);
    }

    const discordToken = process.env.DISCORD_TOKEN;
    const discordClientId = process.env.DISCORD_CLIENT_ID;
    
    if (discordToken && discordClientId) {
      discordBot = new DiscordBot(discordToken, discordClientId);
    }

    // Initialize job manager and run jobs
    const jobManager = new JobManager(telegramBot, discordBot);
    
    // Get the job type from query parameter
    const jobType = req.query.job as string;
    
    if (jobType === 'daily-digest') {
      await jobManager['runDailyDigest']();
      logger.info('Daily digest job completed');
    } else if (jobType === 'draft-notifications') {
      await jobManager['runDraftNotifications']();
      logger.info('Draft notifications job completed');
    } else if (jobType === 'intelligent-notifications') {
      await jobManager['runIntelligentNotifications']();
      logger.info('Intelligent notifications job completed');
    } else {
      logger.warn(`Unknown job type: ${jobType}`);
      res.status(400).json({ error: 'Unknown job type' });
      return;
    }

    res.status(200).json({ success: true, job: jobType });
  } catch (error) {
    logger.error('Cron job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}