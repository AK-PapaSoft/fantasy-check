import { TelegramBot } from '../bot';
import { DiscordBot } from '../discord-bot';
import { DailyDigestJob } from './daily-digest';
import { CacheRefreshJob } from './cache-refresh';
import { DraftNotificationsJob } from './draft-notifications';
import { IntelligentNotificationsJob } from './intelligent-notifications';
import pino from 'pino';

const logger = pino({ name: 'jobs:manager' });

export class JobManager {
  private dailyDigestJob: DailyDigestJob;
  private cacheRefreshJob: CacheRefreshJob;
  private draftNotificationsJob: DraftNotificationsJob;
  private intelligentNotificationsJob: IntelligentNotificationsJob;
  private isRunning: boolean = false;
  private telegramBot: TelegramBot;
  private discordBot?: DiscordBot;

  constructor(telegramBot: TelegramBot, discordBot?: DiscordBot) {
    this.telegramBot = telegramBot;
    this.discordBot = discordBot;
    this.dailyDigestJob = new DailyDigestJob(telegramBot, discordBot);
    this.cacheRefreshJob = new CacheRefreshJob();
    this.draftNotificationsJob = new DraftNotificationsJob(telegramBot, discordBot);
    this.intelligentNotificationsJob = new IntelligentNotificationsJob(telegramBot, discordBot);
  }

  /**
   * Start all cron jobs
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Job manager is already running');
      return;
    }

    try {
      // Start intelligent notifications job (replaces daily digest)
      this.intelligentNotificationsJob.start();

      // Start cache refresh job (runs every 5 minutes)
      this.cacheRefreshJob.start();

      // Start cache cleanup job (runs daily at 2 AM UTC)
      this.cacheRefreshJob.startCleanupJob();

      // Start draft notifications job (runs every minute during draft season)
      this.draftNotificationsJob.start();

      this.isRunning = true;
      logger.info('All cron jobs started successfully (using intelligent notifications)');

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : error,
      }, 'Failed to start cron jobs');
      throw error;
    }
  }

  /**
   * Stop all cron jobs
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Job manager is not running');
      return;
    }

    try {
      this.intelligentNotificationsJob.stop();
      this.cacheRefreshJob.stop();
      this.draftNotificationsJob.stop();

      this.isRunning = false;
      logger.info('All cron jobs stopped successfully');

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : error,
      }, 'Error stopping cron jobs');
    }
  }

  /**
   * Get status of all jobs
   */
  getStatus(): {
    running: boolean;
    intelligentNotifications: any;
    cacheRefresh: any;
    draftNotifications: any;
  } {
    return {
      running: this.isRunning,
      intelligentNotifications: this.intelligentNotificationsJob.getStatus(),
      cacheRefresh: this.cacheRefreshJob.getStatus(),
      draftNotifications: this.draftNotificationsJob.getStatus(),
    };
  }

  /**
   * Manually trigger daily digest for a user (for testing)
   */
  async triggerDailyDigest(tgUserId: bigint): Promise<void> {
    await this.dailyDigestJob.triggerForUser(tgUserId);
  }

  /**
   * Manually refresh league cache (for testing/admin)
   */
  async refreshLeague(leagueId: number, week?: number): Promise<void> {
    await this.cacheRefreshJob.refreshLeague(leagueId, week);
  }
}

// Export individual job classes for direct use if needed
export { DailyDigestJob, CacheRefreshJob, DraftNotificationsJob, IntelligentNotificationsJob };