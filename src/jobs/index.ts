import { TelegramBot } from '../bot';
import { DailyDigestJob } from './daily-digest';
import { CacheRefreshJob } from './cache-refresh';
import pino from 'pino';

const logger = pino({ name: 'jobs:manager' });

export class JobManager {
  private dailyDigestJob: DailyDigestJob;
  private cacheRefreshJob: CacheRefreshJob;
  private isRunning: boolean = false;

  constructor(telegramBot: TelegramBot) {
    this.dailyDigestJob = new DailyDigestJob(telegramBot);
    this.cacheRefreshJob = new CacheRefreshJob();
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
      // Start daily digest job (runs hourly, sends at 8 AM user time)
      this.dailyDigestJob.start();

      // Start cache refresh job (runs every 5 minutes)
      this.cacheRefreshJob.start();

      // Start cache cleanup job (runs daily at 2 AM UTC)
      this.cacheRefreshJob.startCleanupJob();

      this.isRunning = true;
      logger.info('All cron jobs started successfully');

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
      this.dailyDigestJob.stop();
      this.cacheRefreshJob.stop();

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
    dailyDigest: any;
    cacheRefresh: any;
  } {
    return {
      running: this.isRunning,
      dailyDigest: this.dailyDigestJob.getStatus(),
      cacheRefresh: this.cacheRefreshJob.getStatus(),
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
export { DailyDigestJob, CacheRefreshJob };