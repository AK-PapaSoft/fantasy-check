import { VercelRequest, VercelResponse } from '@vercel/node';
import { config } from 'dotenv';
import { TelegramBot } from '../src/bot';
import { HttpServer } from '../src/http';
import { connectDatabase } from '../src/db';
import pino from 'pino';

// Load environment variables
config();

const logger = pino({ 
  name: 'vercel-handler',
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

let telegramBot: TelegramBot | undefined;
let httpServer: HttpServer | undefined;
let isInitialized = false;

async function initializeApp() {
  if (isInitialized) return;
  
  try {
    logger.info('Initializing application for Vercel...');

    // Validate required environment variables
    const required = ['TELEGRAM_TOKEN'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Try to connect to database
    try {
      await connectDatabase();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.warn('Database connection failed:', error);
    }

    // Initialize HTTP server (without starting it)
    httpServer = new HttpServer(3000);

    // Initialize Telegram bot
    const telegramToken = process.env.TELEGRAM_TOKEN!;
    telegramBot = new TelegramBot(telegramToken);

    // Set webhook URL for production
    const webhookUrl = process.env.VERCEL_URL || process.env.APP_BASE_URL;
    if (webhookUrl && process.env.NODE_ENV === 'production') {
      await telegramBot['bot'].telegram.setWebhook(`${webhookUrl}/api`);
      logger.info('Webhook set successfully');
    }

    isInitialized = true;
    logger.info('Application initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    throw error;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await initializeApp();

    // Handle webhook requests
    if (req.method === 'POST' && telegramBot) {
      logger.info('Processing Telegram webhook...');
      
      await telegramBot['bot'].handleUpdate(req.body);
      res.status(200).json({ ok: true });
      return;
    }

    // Handle health check
    if (req.method === 'GET' && req.url === '/health') {
      res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV 
      });
      return;
    }

    // Handle other HTTP routes through the HTTP server
    if (httpServer) {
      const app = httpServer['app'];
      
      // Convert Vercel request/response to Express format
      const expressReq = req as any;
      const expressRes = res as any;
      
      app(expressReq, expressRes);
      return;
    }

    res.status(404).json({ error: 'Not found' });
  } catch (error) {
    logger.error('Handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}