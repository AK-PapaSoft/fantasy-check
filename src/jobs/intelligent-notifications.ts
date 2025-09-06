import * as cron from 'node-cron';
import { TelegramBot } from '../bot';
import { SleeperClient, SleeperMatchup, SleeperRoster } from '../services/sleeper-client';
import { connectDatabase } from '../db';
import { t } from '../i18n';
import { isHourInTimezone, getDayOfWeekInTimezone } from '../utils/timezone';
import { MultiPlatformMessenger } from './utils/multi-platform-messenger';
import pino from 'pino';

const logger = pino({ name: 'jobs:intelligent-notifications' });

interface UserNotificationData {
  tgUserId: bigint;
  timezone: string;
  leagues: Array<{
    id: number;
    name: string;
    providerLeagueId: string;
    teamId: string;
    alertsEnabled: {
      pregame: boolean;
      scoring: boolean;
      waivers: boolean;
    };
  }>;
}

interface GameDayNotification {
  leagues: string[];
  playingPlayers: string[];
  gameStartTimes: string[];
}

export class IntelligentNotificationsJob {
  private cronTask: cron.ScheduledTask | null = null;
  private sleeper: SleeperClient;
  private messenger: MultiPlatformMessenger;
  private isRunning: boolean = false;

  constructor(telegramBot: TelegramBot) {
    this.messenger = new MultiPlatformMessenger(telegramBot);
    this.sleeper = new SleeperClient();
  }

  /**
   * Start the intelligent notifications cron job (runs hourly)
   */
  start(): void {
    if (this.cronTask) {
      logger.warn('Intelligent notifications job is already running');
      return;
    }

    // Run every hour
    this.cronTask = cron.schedule('0 * * * *', () => {
      this.processNotifications();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.cronTask.start();
    this.isRunning = true;
    logger.info('Intelligent notifications cron job started (runs every hour)');
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
    logger.info('Intelligent notifications cron job stopped');
  }

  /**
   * Get job status
   */
  getStatus(): { running: boolean } {
    return {
      running: this.isRunning,
    };
  }

  /**
   * Main processing function - checks what notifications to send
   */
  private async processNotifications(): Promise<void> {
    if (!this.isRunning) return;

    try {
      logger.debug('Processing intelligent notifications...');

      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      try {
        // Get all users with their leagues and alerts settings
        const users = await prisma.user.findMany({
          include: {
            leagues: {
              include: {
                league: true,
              },
            },
            alerts: true,
          },
        });

        for (const user of users) {
          const userData: UserNotificationData = {
            tgUserId: user.tgUserId,
            timezone: user.tz,
            leagues: user.leagues.map(ul => {
              // Find alerts for this user-league combination
              const alerts = user.alerts.find(a => a.leagueId === ul.league.id);
              
              return {
                id: ul.league.id,
                name: ul.league.name,
                providerLeagueId: ul.league.providerLeagueId,
                teamId: ul.teamId,
                alertsEnabled: {
                  pregame: alerts?.pregame ?? true,
                  scoring: alerts?.scoring ?? true,
                  waivers: alerts?.waivers ?? true,
                },
              };
            }),
          };

          await this.processUserNotifications(userData);
        }

      } finally {
        await prisma.$disconnect();
      }

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : error,
      }, 'Error in intelligent notifications processing');
    }
  }

  /**
   * Process notifications for a specific user
   */
  private async processUserNotifications(userData: UserNotificationData): Promise<void> {
    try {
      const dayOfWeek = getDayOfWeekInTimezone(userData.timezone);
      const currentHour = new Date().getUTCHours();

      // Wednesday evening (6 PM) - Team management reminder
      if (dayOfWeek === 3 && isHourInTimezone(userData.timezone, 18)) {
        await this.sendWednesdayTeamReminder(userData);
      }

      // Tuesday evening (6 PM) - Waiver reminder (1 day before Wednesday waivers)
      if (dayOfWeek === 2 && isHourInTimezone(userData.timezone, 18)) {
        await this.sendWaiverReminder(userData);
      }

      // Game days (Thursday-Monday) - Only if user has playing players
      const gameDays = [4, 5, 6, 0, 1]; // Thu, Fri, Sat, Sun, Mon (Sunday is 0)
      if (gameDays.includes(dayOfWeek) && isHourInTimezone(userData.timezone, 8)) {
        await this.sendGameDayNotification(userData, dayOfWeek);
      }

    } catch (error) {
      logger.error({
        tgUserId: userData.tgUserId.toString(),
        error: error instanceof Error ? error.message : error,
      }, 'Error processing user notifications');
    }
  }

  /**
   * Send Wednesday team management reminder
   */
  private async sendWednesdayTeamReminder(userData: UserNotificationData): Promise<void> {
    if (userData.leagues.length === 0) return;

    try {
      const activeLeagues = userData.leagues.filter(l => l.alertsEnabled.pregame);
      if (activeLeagues.length === 0) return;

      const injuredPlayers: string[] = [];
      const byeWeekTeams: string[] = [];
      
      // Get current NFL week
      const state = await this.sleeper.getState('nfl');
      const currentWeek = state?.week || 1;

      // Check if season has actually started
      if (state?.season_start_date) {
        const seasonStart = new Date(state.season_start_date);
        const now = new Date();
        if (now < seasonStart) {
          // Season hasn't started yet, don't send notifications
          return;
        }
      }

      // Check each league for roster issues
      for (const league of activeLeagues) {
        try {
          const rosters = await this.sleeper.getRosters(league.providerLeagueId);
          const userRoster = rosters.find(r => r.roster_id.toString() === league.teamId);
          
          if (userRoster && userRoster.players) {
            // Get player info and check for injuries/byes
            const players = await this.sleeper.getPlayers('nfl');
            
            for (const playerId of userRoster.players) {
              const player = players[playerId];
              if (player) {
                // Check injury status
                if (player.injury_status && ['Out', 'IR', 'Doubtful'].includes(player.injury_status)) {
                  injuredPlayers.push(`${player.first_name} ${player.last_name} (${player.injury_status})`);
                }
                
                // Check bye week
                if (player.team) {
                  const schedule = await this.sleeper.getNFLSchedule(currentWeek);
                  const teamOnBye = !schedule.some(game => 
                    game.home === player.team || game.away === player.team
                  );
                  
                  if (teamOnBye && !byeWeekTeams.includes(player.team)) {
                    byeWeekTeams.push(player.team);
                  }
                }
              }
            }
          }
        } catch (error) {
          logger.error({
            leagueId: league.id,
            error: error instanceof Error ? error.message : error,
          }, 'Error checking league roster');
        }
      }

      // Send consolidated message
      let message = '📋 *Час перевірити команди!*\n\n';
      message += `🏈 Тиждень ${currentWeek}\n`;
      message += `🔄 Ліги: ${activeLeagues.map(l => l.name).join(', ')}\n\n`;

      if (injuredPlayers.length > 0) {
        message += '🏥 *Травмовані гравці:*\n';
        message += injuredPlayers.slice(0, 5).join('\n') + '\n\n';
      }

      if (byeWeekTeams.length > 0) {
        message += '😴 *Команди на вихідних:*\n';
        message += byeWeekTeams.join(', ') + '\n\n';
      }

      message += '✅ Не забудьте оновити свої склади до четверга!';

      await this.messenger.sendRawMessage(userData.tgUserId, message, {
        parse_mode: 'Markdown',
      });

      logger.info({
        tgUserId: userData.tgUserId.toString(),
        leaguesCount: activeLeagues.length,
      }, 'Wednesday team reminder sent');

    } catch (error) {
      logger.error({
        tgUserId: userData.tgUserId.toString(),
        error: error instanceof Error ? error.message : error,
      }, 'Failed to send Wednesday team reminder');
    }
  }

  /**
   * Send waiver reminder (Tuesday evening)
   */
  private async sendWaiverReminder(userData: UserNotificationData): Promise<void> {
    const activeLeagues = userData.leagues.filter(l => l.alertsEnabled.waivers);
    if (activeLeagues.length === 0) return;

    try {
      const message = `📝 *Нагадування про Waivers!*\n\n` +
                     `⏰ Завтра (середа) закривається прийом заявок\n\n` +
                     `🔄 Ліги: ${activeLeagues.map(l => l.name).join(', ')}\n\n` +
                     `💡 Не забудьте подати заявки на потрібних гравців!`;

      await this.messenger.sendRawMessage(userData.tgUserId, message, {
        parse_mode: 'Markdown',
      });

      logger.info({
        tgUserId: userData.tgUserId.toString(),
        leaguesCount: activeLeagues.length,
      }, 'Waiver reminder sent');

    } catch (error) {
      logger.error({
        tgUserId: userData.tgUserId.toString(),
        error: error instanceof Error ? error.message : error,
      }, 'Failed to send waiver reminder');
    }
  }

  /**
   * Send game day notification only if user has playing players
   */
  private async sendGameDayNotification(userData: UserNotificationData, dayOfWeek: number): Promise<void> {
    const activeLeagues = userData.leagues.filter(l => l.alertsEnabled.pregame);
    if (activeLeagues.length === 0) return;

    try {
      const state = await this.sleeper.getState('nfl');
      const currentWeek = state?.week || 1;

      // Check if season has actually started
      if (state?.season_start_date) {
        const seasonStart = new Date(state.season_start_date);
        const now = new Date();
        if (now < seasonStart) {
          // Season hasn't started yet, don't send notifications
          return;
        }
      }
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDay = dayNames[dayOfWeek];

      let hasPlayingPlayers = false;
      const playingPlayers: string[] = [];
      const gamesInfo: string[] = [];

      // Get today's NFL schedule
      const schedule = await this.sleeper.getNFLSchedule(currentWeek);
      const todaysGames = schedule.filter(game => {
        const gameDate = new Date(game.startTime);
        const gameDayOfWeek = gameDate.getUTCDay();
        return gameDayOfWeek === dayOfWeek;
      });

      if (todaysGames.length === 0) {
        return; // No games today, no notification needed
      }

      // Check each league for playing players
      for (const league of activeLeagues) {
        try {
          const rosters = await this.sleeper.getRosters(league.providerLeagueId);
          const userRoster = rosters.find(r => r.roster_id.toString() === league.teamId);
          
          if (userRoster && userRoster.players) {
            const players = await this.sleeper.getPlayers('nfl');
            
            for (const playerId of userRoster.players) {
              const player = players[playerId];
              if (player && player.team) {
                // Check if player's team is playing today
                const isPlaying = todaysGames.some(game => 
                  game.home === player.team || game.away === player.team
                );
                
                if (isPlaying) {
                  hasPlayingPlayers = true;
                  playingPlayers.push(`${player.first_name} ${player.last_name} (${player.team})`);
                }
              }
            }
          }
        } catch (error) {
          logger.error({
            leagueId: league.id,
            error: error instanceof Error ? error.message : error,
          }, 'Error checking league players');
        }
      }

      // Only send notification if user has playing players
      if (!hasPlayingPlayers) {
        return;
      }

      // Format games info
      for (const game of todaysGames) {
        const gameTime = new Date(game.startTime).toLocaleTimeString('uk-UA', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: userData.timezone,
        });
        gamesInfo.push(`${game.away} @ ${game.home} (${gameTime})`);
      }

      let message = `🏈 *${currentDay} - День гри!*\n\n`;
      message += `📅 Тиждень ${currentWeek}\n`;
      message += `🔄 Ліги: ${activeLeagues.map(l => l.name).join(', ')}\n\n`;

      if (playingPlayers.length > 0) {
        message += '⭐ *Ваші гравці сьогодні:*\n';
        message += playingPlayers.slice(0, 10).join('\n') + '\n\n';
      }

      message += '🎮 *Сьогоднішні ігри:*\n';
      message += gamesInfo.join('\n') + '\n\n';
      message += '🔥 Удачі вашим гравцям!';

      await this.messenger.sendRawMessage(userData.tgUserId, message, {
        parse_mode: 'Markdown',
      });

      logger.info({
        tgUserId: userData.tgUserId.toString(),
        dayOfWeek: currentDay,
        leaguesCount: activeLeagues.length,
        playingPlayersCount: playingPlayers.length,
      }, 'Game day notification sent');

    } catch (error) {
      logger.error({
        tgUserId: userData.tgUserId.toString(),
        dayOfWeek,
        error: error instanceof Error ? error.message : error,
      }, 'Failed to send game day notification');
    }
  }
}