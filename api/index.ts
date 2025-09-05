import { VercelRequest, VercelResponse } from '@vercel/node';
import { config } from 'dotenv';
import { TelegramBot } from '../src/bot';
import { connectDatabase } from '../src/db';
import pino from 'pino';

// Load environment variables
config();

const logger = pino({ 
  name: 'vercel-handler',
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

let telegramBot: TelegramBot | undefined;
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

    // Initialize Telegram bot
    const telegramToken = process.env.TELEGRAM_TOKEN!;
    telegramBot = new TelegramBot(telegramToken);

    // Set webhook URL for production
    const webhookUrl = process.env.VERCEL_URL || process.env.APP_BASE_URL;
    if (webhookUrl && process.env.NODE_ENV === 'production') {
      const fullWebhookUrl = webhookUrl.startsWith('http') ? webhookUrl : `https://${webhookUrl}`;
      await telegramBot['bot'].telegram.setWebhook(`${fullWebhookUrl}/api`);
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
    if (req.method === 'GET' && (req.url === '/health' || req.url?.includes('/health'))) {
      res.status(200).json({ 
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        message: 'Fantasy Gather Bot is running on Vercel',
        environment: process.env.NODE_ENV 
      });
      return;
    }

    // Handle root route - landing page
    if (req.method === 'GET' && (req.url === '/' || req.url === '')) {
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(`
        <!DOCTYPE html>
        <html lang="uk">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Fantasy Gather - Sleeper NFL Bot 🏈</title>
            <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' role='img' aria-label='Fantasy bot logo: chat bubble + football' width='512' height='512'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%2316a34a'/%3E%3Cstop offset='100%25' stop-color='%230ea5e9'/%3E%3C/linearGradient%3E%3Cfilter id='s' x='-20%25' y='-20%25' width='140%25' height='140%25'%3E%3CfeDropShadow dx='0' dy='6' stdDeviation='12' flood-opacity='0.18'/%3E%3C/filter%3E%3C/defs%3E%3Ccircle cx='256' cy='256' r='224' fill='url(%23g)' /%3E%3Cg filter='url(%23s)'%3E%3Cpath d='M356 172c-22-22-53-34-100-34s-78 12-100 34c-22 22-34 53-34 100s12 78 34 100c22 22 53 34 100 34h14c13 0 24 11 24 24v24l46-34c8-6 13-15 13-25v-3c29-19 43-53 43-100 0-47-12-78-34-100z' fill='%23ffffff'/%3E%3C/g%3E%3Cg transform='translate(256 256) rotate(-18)'%3E%3Cellipse cx='0' cy='0' rx='120' ry='72' fill='%237c3f11'/%3E%3Crect x='-110' y='-10' width='28' height='20' rx='10' fill='%23ffffff'/%3E%3Crect x='82' y='-10' width='28' height='20' rx='10' fill='%23ffffff'/%3E%3Crect x='-40' y='-6' width='80' height='12' rx='6' fill='%23ffffff'/%3E%3Crect x='-28' y='-22' width='8' height='32' rx='4' fill='%23ffffff'/%3E%3Crect x='-10' y='-22' width='8' height='32' rx='4' fill='%23ffffff'/%3E%3Crect x='8' y='-22' width='8' height='32' rx='4' fill='%23ffffff'/%3E%3Crect x='26' y='-22' width='8' height='32' rx='4' fill='%23ffffff'/%3E%3C/g%3E%3C/svg%3E">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    color: #333;
                    line-height: 1.6;
                }
                
                .container { 
                    max-width: 900px; 
                    margin: 0 auto; 
                    padding: 40px 20px;
                }
                
                .hero {
                    text-align: center;
                    background: rgba(255,255,255,0.95);
                    padding: 60px 40px;
                    border-radius: 20px;
                    margin-bottom: 40px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                }
                
                .hero h1 {
                    font-size: 3.5em;
                    margin-bottom: 20px;
                    background: linear-gradient(45deg, #667eea, #764ba2);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                
                .status { 
                    display: inline-block;
                    background: #28a745;
                    color: white;
                    padding: 12px 24px;
                    border-radius: 25px;
                    font-weight: bold;
                    margin: 20px 0;
                }
                
                .telegram-link {
                    display: inline-block;
                    background: linear-gradient(45deg, #0088cc, #0066aa);
                    color: white;
                    padding: 15px 30px;
                    border-radius: 25px;
                    text-decoration: none;
                    font-weight: bold;
                    font-size: 1.2em;
                    margin: 20px 10px;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(0,136,204,0.3);
                }
                
                .telegram-link:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 25px rgba(0,136,204,0.4);
                }
                
                .footer {
                    text-align: center;
                    padding: 40px;
                    color: rgba(255,255,255,0.8);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="hero">
                    <h1>🏈 Fantasy Gather</h1>
                    <p style="font-size: 1.3em; color: #666; margin-bottom: 30px;">Розумний бот для Sleeper NFL Fantasy футболу</p>
                    <div class="status">✅ Бот працює на Vercel!</div>
                    <br>
                    <a href="https://t.me/FantasyGatherBot" class="telegram-link" target="_blank">
                        📱 Відкрити в Telegram
                    </a>
                    <br>
                    <a href="/health" style="color: #666; text-decoration: none; font-size: 0.9em; margin-top: 20px; display: inline-block;">
                        🔍 Перевірити статус API
                    </a>
                </div>
            </div>

            <div class="footer">
                <p>Made with ❤️ for fantasy football enthusiasts</p>
                <p><small>Deployed on Vercel: ${new Date().toLocaleString('uk-UA')}</small></p>
            </div>
        </body>
        </html>
      `);
      return;
    }

    res.status(404).json({ error: 'Not found' });
  } catch (error) {
    logger.error('Handler error:', error);
    res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}