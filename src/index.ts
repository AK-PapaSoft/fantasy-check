import { config } from 'dotenv';
import { TelegramBot } from './bot';
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
  private httpServer?: HttpServer;
  private jobManager?: JobManager;
  private isShuttingDown = false;

  async start(): Promise<void> {
    try {
      logger.info('Starting Sleeper NFL Bot application...');

      // Validate required environment variables
      this.validateEnvironment();

      // Connect to database
      await connectDatabase();
      logger.info('Database connected successfully');

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
        this.httpServer.addWebhookPath('/webhook', this.telegramBot.getApp().webhookCallback('/webhook'));
        
        // Start with webhook
        await this.telegramBot.startWebhook(webhookUrl, port);
      } else {
        // Development: use polling
        await this.telegramBot.startPolling();
      }

      // Initialize and start cron jobs
      this.jobManager = new JobManager(this.telegramBot);
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
      'DATABASE_URL',
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate optional but recommended variables
    const recommended = [
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