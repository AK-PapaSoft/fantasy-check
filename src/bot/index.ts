import { Telegraf, Context } from 'telegraf';
import { handleStart } from './handlers/start';
import { handleHelp } from './handlers/help';
import { handleLinkSleeper } from './handlers/link-sleeper';
import { handleLeagues, handleLeagueCallback } from './handlers/leagues';
import { handleToday } from './handlers/today';
import { handleTimezone, handleTimezoneInput } from './handlers/timezone';
import { t } from '../i18n';
import pino from 'pino';

const logger = pino({ name: 'telegram-bot' });

export class TelegramBot {
  private bot: Telegraf;
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
    this.bot = new Telegraf(token);
    
    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupHandlers(): void {
    // Command handlers
    this.bot.command('start', handleStart);
    this.bot.command('help', handleHelp);
    this.bot.command('link_sleeper', handleLinkSleeper);
    this.bot.command('leagues', handleLeagues);
    this.bot.command('today', handleToday);
    this.bot.command('timezone', handleTimezone);

    // Callback query handlers (inline buttons)
    this.bot.on('callback_query', handleLeagueCallback);

    // Text message handler (for timezone input)
    this.bot.on('text', handleTimezoneInput);

    // Handle unknown commands
    this.bot.on('message', async (ctx: Context) => {
      if (ctx.message && 'text' in ctx.message && ctx.message.text.startsWith('/')) {
        await ctx.reply(t('error_generic') + '\n\nВикористай /help для списку команд.');
      }
    });

    logger.info('Bot handlers setup completed');
  }

  private setupErrorHandling(): void {
    this.bot.catch(async (err: any, ctx: Context) => {
      logger.error({
        error: err.message || err,
        userId: ctx.from?.id,
        chatId: ctx.chat?.id,
        updateType: ctx.updateType,
      }, 'Bot error occurred');

      try {
        await ctx.reply(t('error_generic'));
      } catch (replyError) {
        logger.error('Failed to send error message to user:', replyError);
      }
    });

    // Handle process errors
    process.on('unhandledRejection', (reason, promise) => {
      logger.error({
        reason,
        promise,
      }, 'Unhandled rejection in bot');
    });

    process.on('uncaughtException', (error) => {
      logger.error({
        error: error.message,
        stack: error.stack,
      }, 'Uncaught exception in bot');
      
      // Graceful shutdown
      this.stop().then(() => {
        process.exit(1);
      });
    });
  }

  /**
   * Start bot with webhook
   */
  async startWebhook(webhookUrl: string, port: number = 8080, path: string = '/webhook'): Promise<void> {
    try {
      // Set webhook
      await this.bot.telegram.setWebhook(`${webhookUrl}${path}`);
      
      logger.info({
        webhookUrl: `${webhookUrl}${path}`,
        port,
        path,
      }, 'Bot webhook configured');

    } catch (error) {
      logger.error('Failed to start bot with webhook:', error);
      throw error;
    }
  }

  /**
   * Start bot with polling (for development)
   */
  async startPolling(): Promise<void> {
    try {
      // Remove webhook if exists
      await this.bot.telegram.deleteWebhook();
      
      // Start polling
      await this.bot.launch();
      
      logger.info('Bot started with polling');

    } catch (error) {
      logger.error('Failed to start bot with polling:', error);
      throw error;
    }
  }

  /**
   * Stop bot gracefully
   */
  async stop(): Promise<void> {
    try {
      this.bot.stop('SIGTERM');
      logger.info('Bot stopped gracefully');
    } catch (error) {
      logger.error('Error stopping bot:', error);
    }
  }

  /**
   * Send message to user
   */
  async sendMessage(chatId: number, message: string, options?: any): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(chatId, message, options);
    } catch (error) {
      logger.error({
        chatId,
        message: message.substring(0, 100),
        error: error instanceof Error ? error.message : error,
      }, 'Failed to send message');
      throw error;
    }
  }

  /**
   * Send digest messages to user
   */
  async sendDigestToUser(userId: number, digests: Array<{ message: string }>): Promise<void> {
    try {
      for (const digest of digests) {
        await this.sendMessage(userId, digest.message, {
          parse_mode: 'Markdown',
        });
        
        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      logger.info({
        userId,
        digestsCount: digests.length,
      }, 'Digest sent to user');

    } catch (error) {
      logger.error({
        userId,
        digestsCount: digests.length,
        error: error instanceof Error ? error.message : error,
      }, 'Failed to send digest to user');
    }
  }

  /**
   * Get bot info
   */
  async getBotInfo(): Promise<any> {
    try {
      return await this.bot.telegram.getMe();
    } catch (error) {
      logger.error('Failed to get bot info:', error);
      throw error;
    }
  }
}