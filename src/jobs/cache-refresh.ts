import * as cron from 'node-cron';
import { FantasyService } from '../services/fantasy-service';
import { SleeperClient } from '../services/sleeper-client';
import { prisma } from '../db';
import pino from 'pino';

const logger = pino({ name: 'jobs:cache-refresh' });

export class CacheRefreshJob {
  private fantasyService: FantasyService;
  private sleeperClient: SleeperClient;
  private task: cron.ScheduledTask | null = null;

  constructor() {
    this.fantasyService = new FantasyService();
    this.sleeperClient = new SleeperClient();
  }

  /**
   * Start the cache refresh cron job
   * Runs every 5 minutes to refresh active league data
   */
  start(): void {
    if (this.task) {
      logger.warn('Cache refresh job is already running');
      return;
    }

    // Run every 5 minutes
    this.task = cron.schedule('*/5 * * * *', async () => {
      await this.refreshActiveLeagues();
    }, {
      scheduled: false,
      timezone: 'UTC',
    });

    this.task.start();
    logger.info('Cache refresh cron job started (runs every 5 minutes)');
  }

  /**
   * Stop the cache refresh cron job
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('Cache refresh cron job stopped');
    }
  }

  /**
   * Refresh matchups data for all active leagues
   */
  private async refreshActiveLeagues(): Promise<void> {
    try {
      logger.debug('Starting cache refresh for active leagues');

      // Get current week
      const state = await this.sleeperClient.getState('nfl');
      const currentWeek = state?.week || 1;

      // Get all leagues with recent activity (users who have leagues)
      const activeLeagues = await prisma.league.findMany({
        where: {
          users: {
            some: {}, // Leagues that have at least one user
          },
          sport: 'nfl', // Only NFL for now
          season: parseInt(state?.league_season || new Date().getFullYear().toString()),
        },
        select: {
          id: true,
          name: true,
          providerLeagueId: true,
        },
      });

      if (activeLeagues.length === 0) {
        logger.debug('No active leagues found for cache refresh');
        return;
      }

      let refreshedCount = 0;
      let errorCount = 0;

      for (const league of activeLeagues) {
        try {
          // Refresh current week data
          await this.fantasyService.refreshLeagueWeek(league.id, currentWeek);
          refreshedCount++;

          // Rate limiting: 2 requests per second max to respect Sleeper API
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          errorCount++;
          logger.error({
            leagueId: league.id,
            leagueName: league.name,
            week: currentWeek,
            error: error instanceof Error ? error.message : error,
          }, 'Failed to refresh league cache');
        }
      }

      if (refreshedCount > 0 || errorCount > 0) {
        logger.info({
          totalLeagues: activeLeagues.length,
          refreshedCount,
          errorCount,
          currentWeek,
        }, 'Cache refresh completed');
      }

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : error,
      }, 'Error in cache refresh processing');
    }
  }

  /**
   * Manually refresh a specific league (for testing/admin)
   */
  async refreshLeague(leagueId: number, week?: number): Promise<void> {
    const state = await this.sleeperClient.getState('nfl');
    const targetWeek = week || state?.week || 1;
    
    await this.fantasyService.refreshLeagueWeek(leagueId, targetWeek);
    
    logger.info({
      leagueId,
      week: targetWeek,
    }, 'League manually refreshed');
  }

  /**
   * Clean old cache data (run daily to prevent database bloat)
   */
  private async cleanOldCache(): Promise<void> {
    try {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const result = await prisma.matchupsCache.deleteMany({
        where: {
          fetchedAt: {
            lt: twoWeeksAgo,
          },
        },
      });

      if (result.count > 0) {
        logger.info({
          deletedCount: result.count,
          cutoffDate: twoWeeksAgo,
        }, 'Old cache data cleaned up');
      }

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : error,
      }, 'Error cleaning old cache data');
    }
  }

  /**
   * Start cache cleanup job (runs daily at 2 AM UTC)
   */
  startCleanupJob(): void {
    cron.schedule('0 2 * * *', async () => {
      await this.cleanOldCache();
    }, {
      timezone: 'UTC',
    });

    logger.info('Cache cleanup job started (runs daily at 2 AM UTC)');
  }

  /**
   * Get job status
   */
  getStatus(): { running: boolean; cacheSize?: number } {
    return {
      running: this.task !== null,
      // Could add cache size info here if needed
    };
  }
}