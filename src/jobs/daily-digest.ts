import * as cron from 'node-cron';
import { FantasyService } from '../services/fantasy-service';
import { TelegramBot } from '../bot';
import { DiscordBot } from '../discord-bot';
import { isHourInTimezone } from '../utils/timezone';
import { t } from '../i18n';
import pino from 'pino';

const logger = pino({ name: 'jobs:daily-digest' });

export class DailyDigestJob {
  private fantasyService: FantasyService;
  private telegramBot: TelegramBot;
  private discordBot?: DiscordBot;
  private task: cron.ScheduledTask | null = null;

  constructor(telegramBot: TelegramBot, discordBot?: DiscordBot) {
    this.fantasyService = new FantasyService();
    this.telegramBot = telegramBot;
    this.discordBot = discordBot;
  }

  /**
   * Start the daily digest cron job
   * Runs every hour and checks if it's 8 AM in each user's timezone
   */
  start(): void {
    if (this.task) {
      logger.warn('Daily digest job is already running');
      return;
    }

    // Run every hour at minute 0
    this.task = cron.schedule('0 * * * *', async () => {
      await this.processDailyDigests();
    }, {
      scheduled: false,
      timezone: 'UTC',
    });

    this.task.start();
    logger.info('Daily digest cron job started (runs every hour)');
  }

  /**
   * Stop the daily digest cron job
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('Daily digest cron job stopped');
    }
  }

  /**
   * Process daily digests for all users
   */
  private async processDailyDigests(): Promise<void> {
    try {
      logger.info('Starting daily digest processing');

      const users = await this.fantasyService.getUsersForDailyDigest();
      
      if (users.length === 0) {
        logger.info('No users found for daily digest');
        return;
      }

      let processedCount = 0;
      let errorCount = 0;

      for (const user of users) {
        try {
          // Check if it's 8 AM in user's timezone
          if (isHourInTimezone(user.timezone, 8)) {
            await this.sendDailyDigestToUser(user.tgUserId);
            processedCount++;
            
            // Rate limiting: small delay between messages
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          errorCount++;
          logger.error({
            tgUserId: user.tgUserId.toString(),
            timezone: user.timezone,
            error: error instanceof Error ? error.message : error,
          }, 'Failed to send daily digest to user');
        }
      }

      if (processedCount > 0 || errorCount > 0) {
        logger.info({
          totalUsers: users.length,
          processedCount,
          errorCount,
        }, 'Daily digest processing completed');
      }

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : error,
      }, 'Error in daily digest processing');
    }
  }

  /**
   * Send daily digest to a specific user
   */
  private async sendDailyDigestToUser(tgUserId: bigint): Promise<void> {
    try {
      const digests = await this.fantasyService.getWeekDigest(tgUserId);
      
      if (digests.length === 0) {
        // Send "no games" message
        await this.telegramBot.sendMessage(Number(tgUserId), t('no_games'));
        return;
      }

      // Format digests as messages
      const digestMessages = digests.map(digest => {
        let message = t('digest_header', {
          league: digest.league,
          week: digest.week.toString(),
        }) + '\n\n';

        message += t('digest_team', { team: digest.team });

        if (digest.opponent) {
          message += '\n' + t('digest_opponent', { opponent: digest.opponent });
        }

        if (digest.myScore !== undefined && digest.oppScore !== undefined) {
          message += '\n' + t('digest_score', {
            myScore: digest.myScore.toString(),
            oppScore: digest.oppScore.toString(),
          });
        }

        if (digest.topPlayers.length > 0) {
          message += '\n\n' + t('digest_top_players', {
            players: digest.topPlayers.join(', '),
          });
        }

        if (digest.upcomingGames.length > 0) {
          message += '\n\n' + t('digest_upcoming', {
            games: digest.upcomingGames.join(', '),
          });
        }

        if (digest.reminders.length > 0) {
          message += '\n\n' + t('digest_reminders', {
            reminders: digest.reminders.join(', '),
          });
        }

        return { message };
      });

      await this.telegramBot.sendDigestToUser(Number(tgUserId), digestMessages);

      logger.info({
        tgUserId: tgUserId.toString(),
        digestsCount: digestMessages.length,
      }, 'Daily digest sent successfully');

    } catch (error) {
      logger.error({
        tgUserId: tgUserId.toString(),
        error: error instanceof Error ? error.message : error,
      }, 'Failed to send daily digest');
      throw error;
    }
  }

  /**
   * Manually trigger daily digest for a user (for testing)
   */
  async triggerForUser(tgUserId: bigint): Promise<void> {
    await this.sendDailyDigestToUser(tgUserId);
  }

  /**
   * Get job status
   */
  getStatus(): { running: boolean; nextRun?: Date } {
    if (!this.task) {
      return { running: false };
    }

    return {
      running: true,
      // Note: node-cron doesn't provide easy access to next execution time
      // In production, you might want to use a more advanced scheduler
    };
  }
}