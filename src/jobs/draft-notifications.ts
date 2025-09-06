import * as cron from 'node-cron';
import { TelegramBot } from '../bot';
import { SleeperClient, SleeperDraft, SleeperDraftPick } from '../services/sleeper-client';
import { connectDatabase } from '../db';
import { t } from '../i18n';
import { MultiPlatformMessenger } from './utils/multi-platform-messenger';
import pino from 'pino';

const logger = pino({ name: 'jobs:draft-notifications' });

interface DraftNotificationState {
  draftId: string;
  startNotificationSent: boolean;
  lastPickNumber: number;
  usersNotified: Set<string>; // user_ids that have been notified of their turn
}

export class DraftNotificationsJob {
  private cronTask: cron.ScheduledTask | null = null;
  private sleeper: SleeperClient;
  private messenger: MultiPlatformMessenger;
  private notificationStates: Map<string, DraftNotificationState> = new Map();
  private isRunning: boolean = false;

  constructor(telegramBot: TelegramBot) {
    this.messenger = new MultiPlatformMessenger(telegramBot);
    this.sleeper = new SleeperClient();
  }

  /**
   * Start the draft notifications cron job (runs every minute during draft season)
   */
  start(): void {
    if (this.cronTask) {
      logger.warn('Draft notifications job is already running');
      return;
    }

    // Run every minute during draft season (typically August-September)
    this.cronTask = cron.schedule('* * * * *', () => {
      this.processDraftNotifications();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.cronTask.start();
    this.isRunning = true;
    logger.info('Draft notifications cron job started (runs every minute)');
  }

  /**
   * Stop the cron job
   */
  stop(): void {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
    }

    this.isRunning = false;
    logger.info('Draft notifications cron job stopped');
  }

  /**
   * Get job status
   */
  getStatus(): { running: boolean; trackedDrafts: number } {
    return {
      running: this.isRunning,
      trackedDrafts: this.notificationStates.size,
    };
  }

  /**
   * Main processing function - checks all active drafts
   */
  private async processDraftNotifications(): Promise<void> {
    if (!this.isRunning) return;

    try {
      logger.debug('Processing draft notifications...');

      // Get all users with leagues to check their drafts
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      try {
        // Get all leagues that might have active drafts
        const leagues = await prisma.league.findMany({
          include: {
            users: {
              include: {
                user: true,
              },
            },
          },
        });

        for (const league of leagues) {
          await this.checkLeagueDrafts(league);
        }

      } finally {
        await prisma.$disconnect();
      }

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : error,
      }, 'Error in draft notifications processing');
    }
  }

  /**
   * Check drafts for a specific league
   */
  private async checkLeagueDrafts(league: any): Promise<void> {
    try {
      const drafts = await this.sleeper.getDrafts(league.providerLeagueId);

      for (const draft of drafts) {
        await this.processDraft(draft, league);
      }

    } catch (error) {
      logger.error({
        leagueId: league.id,
        error: error instanceof Error ? error.message : error,
      }, 'Error checking league drafts');
    }
  }

  /**
   * Process a single draft for notifications
   */
  private async processDraft(draft: SleeperDraft, league: any): Promise<void> {
    const now = Math.floor(Date.now() / 1000); // Unix timestamp
    const draftStartTime = draft.start_time / 1000; // Convert to seconds
    const timeUntilStart = draftStartTime - now;

    // Initialize notification state if not exists
    if (!this.notificationStates.has(draft.draft_id)) {
      this.notificationStates.set(draft.draft_id, {
        draftId: draft.draft_id,
        startNotificationSent: false,
        lastPickNumber: 0,
        usersNotified: new Set(),
      });
    }

    const notificationState = this.notificationStates.get(draft.draft_id)!;

    // Check for 1-hour warning (3600 seconds = 1 hour)
    if (timeUntilStart <= 3600 && timeUntilStart > 0 && !notificationState.startNotificationSent) {
      await this.sendDraftStartNotifications(draft, league);
      notificationState.startNotificationSent = true;
    }

    // Check for active draft and turn notifications
    if (draft.status === 'in_progress') {
      await this.checkDraftTurnNotifications(draft, league, notificationState);
    }

    // Clean up completed drafts
    if (draft.status === 'complete') {
      this.notificationStates.delete(draft.draft_id);
      logger.info({ draftId: draft.draft_id }, 'Cleaned up completed draft notifications');
    }
  }

  /**
   * Send 1-hour draft start notifications to all league members
   */
  private async sendDraftStartNotifications(draft: SleeperDraft, league: any): Promise<void> {
    logger.info({ draftId: draft.draft_id, leagueName: league.name }, 'Sending draft start notifications');

    // Send to all users in the league
    for (const userLeague of league.users) {
      try {
        await this.messenger.sendMessage(
          userLeague.user.tgUserId,
          'draft_starting_soon',
          {
            league: league.name,
            startTime: new Date(draft.start_time).toLocaleString('uk-UA'),
          }
        );
        logger.debug({ userId: userLeague.user.tgUserId.toString() }, 'Draft start notification sent');
      } catch (error) {
        logger.error({
          userId: userLeague.user.tgUserId.toString(),
          error: error instanceof Error ? error.message : error,
        }, 'Failed to send draft start notification');
      }
    }
  }

  /**
   * Check and send draft turn notifications
   */
  private async checkDraftTurnNotifications(
    draft: SleeperDraft,
    league: any,
    notificationState: DraftNotificationState
  ): Promise<void> {
    try {
      const picks = await this.sleeper.getDraftPicks(draft.draft_id);
      const totalPicks = picks.length;

      // Check if there are new picks since last check
      if (totalPicks > notificationState.lastPickNumber) {
        notificationState.lastPickNumber = totalPicks;
        notificationState.usersNotified.clear(); // Reset for the new round
      }

      // Determine whose turn it is
      const nextPickNumber = totalPicks + 1;
      const totalTeams = draft.settings.teams;
      const currentRound = Math.ceil(nextPickNumber / totalTeams);
      
      // Calculate the draft slot for the current pick
      let draftSlot: number;
      if (currentRound % 2 === 1) {
        // Odd rounds: normal order (1, 2, 3, ...)
        draftSlot = ((nextPickNumber - 1) % totalTeams) + 1;
      } else {
        // Even rounds: snake order (reverse)
        draftSlot = totalTeams - ((nextPickNumber - 1) % totalTeams);
      }

      // Find the user who should pick next
      const userIdOnTurn = Object.keys(draft.draft_order).find(
        userId => draft.draft_order[userId] === draftSlot
      );

      if (userIdOnTurn && !notificationState.usersNotified.has(userIdOnTurn)) {
        await this.sendDraftTurnNotification(draft, league, userIdOnTurn, nextPickNumber, currentRound);
        notificationState.usersNotified.add(userIdOnTurn);
      }

    } catch (error) {
      logger.error({
        draftId: draft.draft_id,
        error: error instanceof Error ? error.message : error,
      }, 'Error checking draft turn notifications');
    }
  }

  /**
   * Send draft turn notification to specific user
   */
  private async sendDraftTurnNotification(
    draft: SleeperDraft,
    league: any,
    sleeperUserId: string,
    pickNumber: number,
    round: number
  ): Promise<void> {
    try {
      // Find the Telegram user ID from our database
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      try {
        const provider = await prisma.provider.findFirst({
          where: {
            providerUserId: sleeperUserId,
            provider: 'sleeper',
          },
          include: {
            user: true,
          },
        });

        if (provider) {
          await this.messenger.sendMessage(
            provider.user.tgUserId,
            'draft_your_turn',
            {
              league: league.name,
              round: round.toString(),
              pickNumber: pickNumber.toString(),
              timer: draft.settings.pick_timer.toString(),
            }
          );
          logger.info({
            sleeperUserId,
            userId: provider.user.tgUserId.toString(),
            pickNumber,
            round,
          }, 'Draft turn notification sent');
        } else {
          logger.warn({
            sleeperUserId,
            leagueId: league.id,
          }, 'Could not find Telegram user for Sleeper user ID');
        }

      } finally {
        await prisma.$disconnect();
      }

    } catch (error) {
      logger.error({
        sleeperUserId,
        pickNumber,
        error: error instanceof Error ? error.message : error,
      }, 'Failed to send draft turn notification');
    }
  }
}