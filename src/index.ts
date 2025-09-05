import { config } from 'dotenv';
import { TelegramBot } from './bot';
import { DiscordBot } from './discord-bot';
import { HttpServer } from './http';
import { JobManager } from './jobs';
import { connectDatabase, disconnectDatabase } from './db';
import pino from 'pino';

// Load environment variables
config();

const logger = pino({ 
  name: 'main',
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

class Application {
  private telegramBot?: TelegramBot;
  private discordBot?: DiscordBot;
  private httpServer?: HttpServer;
  private jobManager?: JobManager;
  private isShuttingDown = false;

  async start(): Promise<void> {
    try {
      logger.info('Starting Sleeper NFL Bot application...');

      // Validate required environment variables
      this.validateEnvironment();

      // Try to connect to database
      try {
        await connectDatabase();
        logger.info('Database connected successfully');
      } catch (error) {
        logger.warn('Database connection failed, continuing without database:', error);
        // Continue startup - health check will show database status
      }

      // Initialize HTTP server
      const port = parseInt(process.env.PORT || '8080');
      this.httpServer = new HttpServer(port);
      await this.httpServer.start();

      // Initialize Telegram bot
      const telegramToken = process.env.TELEGRAM_TOKEN!;
      this.telegramBot = new TelegramBot(telegramToken);

      // Start bot based on environment
      if (process.env.NODE_ENV === 'production') {
        // Production: use webhook
        const webhookUrl = process.env.APP_BASE_URL;
        if (!webhookUrl) {
          throw new Error('APP_BASE_URL is required for webhook mode');
        }

        // Add webhook handler to HTTP server  
        const webhookHandler = async (req: any, res: any) => {
          try {
            logger.info({ 
              body: req.body ? JSON.stringify(req.body).substring(0, 200) : 'no body',
              headers: req.headers 
            }, 'Webhook request received');
            
            // Process the update with Telegraf
            await this.telegramBot!['bot'].handleUpdate(req.body);
            res.status(200).send('OK');
            
            logger.info('Webhook processed successfully');
          } catch (error) {
            logger.error({ error: error instanceof Error ? error.message : error }, 'Webhook processing error');
            res.status(500).send('Error');
          }
        };
        this.httpServer.addWebhookPath('/webhook', webhookHandler);
        
        // Add 404 handler after webhook is set up
        this.httpServer.add404Handler();
        
        // Just set the webhook URL, don't start webhook server since we have Express
        await this.telegramBot['bot'].telegram.setWebhook(`${webhookUrl}/webhook`);
      } else {
        // Development: use polling
        await this.telegramBot.startPolling();
      }

      // Initialize Discord bot if token provided
      const discordToken = process.env.DISCORD_TOKEN;
      const discordClientId = process.env.DISCORD_CLIENT_ID;
      
      if (discordToken && discordClientId) {
        this.discordBot = new DiscordBot(discordToken, discordClientId);
        await this.discordBot.registerCommands();
        await this.discordBot.start();
        logger.info('Discord bot started successfully');
      } else {
        logger.info('Discord bot disabled (no token/client ID provided)');
      }

      // Initialize and start cron jobs
      this.jobManager = new JobManager(this.telegramBot, this.discordBot);
      this.jobManager.start();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      const botInfo = await this.telegramBot.getBotInfo();
      logger.info({
        botUsername: botInfo.username,
        botId: botInfo.id,
        mode: process.env.NODE_ENV === 'production' ? 'webhook' : 'polling',
        port,
      }, 'Application started successfully');

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : error,
      }, 'Failed to start application');
      
      await this.shutdown();
      process.exit(1);
    }
  }

  private validateEnvironment(): void {
    const required = [
      'TELEGRAM_TOKEN',
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate optional but recommended variables
    const recommended = [
      'DATABASE_URL',
      'SLEEPER_API_BASE',
      'TIMEZONE',
    ];

    recommended.forEach(key => {
      if (!process.env[key]) {
        logger.warn(`Missing recommended environment variable: ${key}`);
      }
    });

    logger.info('Environment validation passed');
  }

  private setupGracefulShutdown(): void {
    const signals = ['SIGTERM', 'SIGINT'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        if (this.isShuttingDown) {
          logger.warn('Shutdown already in progress, forcing exit');
          process.exit(1);
        }

        logger.info(`Received ${signal}, starting graceful shutdown`);
        await this.shutdown();
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      logger.error({
        error: error.message,
        stack: error.stack,
      }, 'Uncaught exception occurred');
      
      await this.shutdown();
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      logger.error({
        reason,
        promise,
      }, 'Unhandled promise rejection occurred');
      
      await this.shutdown();
      process.exit(1);
    });
  }

  private async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info('Starting application shutdown');

    const shutdownPromises: Promise<void>[] = [];

    // Stop cron jobs
    if (this.jobManager) {
      try {
        this.jobManager.stop();
        logger.info('Cron jobs stopped');
      } catch (error) {
        logger.error('Error stopping cron jobs:', error);
      }
    }

    // Stop Telegram bot
    if (this.telegramBot) {
      shutdownPromises.push(this.telegramBot.stop());
    }

    // Stop Discord bot
    if (this.discordBot) {
      shutdownPromises.push(this.discordBot.stop());
    }

    // Wait for graceful shutdowns
    try {
      await Promise.all(shutdownPromises);
      logger.info('Services stopped gracefully');
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
    }

    // Disconnect from database
    try {
      await disconnectDatabase();
      logger.info('Database disconnected');
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
    }

    logger.info('Application shutdown completed');
  }
}

// Start application
const app = new Application();
app.start().catch(error => {
  logger.error('Application startup failed:', error);
  process.exit(1);
});