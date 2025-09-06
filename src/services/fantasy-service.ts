import { prisma } from '../db';
import { SleeperClient } from './sleeper-client';
import { t } from '../i18n';
import pino from 'pino';

const logger = pino({ name: 'fantasy-service' });

export interface DigestMessage {
  league: string;
  week: number;
  team: string;
  opponent?: string;
  myScore?: number;
  oppScore?: number;
  topPlayers: string[];
  upcomingGames: string[];
  reminders: string[];
}

export interface UserLeagueInfo {
  leagueId: number;
  name: string;
  season: number;
  sport: string;
  teamId: string;
  teamName?: string;
  standing?: number;
  alertsEnabled: {
    pregame: boolean;
    scoring: boolean;
    waivers: boolean;
  };
}

export class FantasyService {
  private readonly sleeperClient: SleeperClient;

  constructor() {
    this.sleeperClient = new SleeperClient();
  }

  /**
   * Sync user's Sleeper data to database
   */
  async syncUserSleeper(
    tgUserId: bigint, 
    username: string,
    userInfo?: {
      tgUsername?: string;
      firstName?: string;
      lastName?: string;
      platform?: string;
    }
  ): Promise<Array<{
    leagueName: string;
    startTime: string;
  }>> {
    try {
      // Get Sleeper user ID
      const sleeperUserId = await this.sleeperClient.getUserIdByUsername(username);
      if (!sleeperUserId) {
        throw new Error(t('user_not_found', { username }));
      }

      // Get current season
      const state = await this.sleeperClient.getState('nfl');
      const currentSeason = state?.league_season || new Date().getFullYear().toString();

      // Get user's leagues
      const leagues = await this.sleeperClient.getUserLeagues(sleeperUserId, 'nfl', currentSeason);
      if (leagues.length === 0) {
        throw new Error(t('no_leagues_found', { username, season: currentSeason }));
      }

      // Start transaction
      await prisma.$transaction(async (tx) => {
        // Create or update user with full info
        const user = await tx.user.upsert({
          where: { tgUserId },
          update: {
            tgUsername: userInfo?.tgUsername,
            firstName: userInfo?.firstName,
            lastName: userInfo?.lastName,
            updatedAt: new Date(),
          },
          create: {
            tgUserId,
            tgUsername: userInfo?.tgUsername,
            firstName: userInfo?.firstName,
            lastName: userInfo?.lastName,
            lang: userInfo?.platform === 'discord' ? 'en' : 'uk',
            tz: process.env.TIMEZONE || 'Europe/Kiev',
            platform: userInfo?.platform || 'telegram',
          },
        });

        // Create or update provider
        await tx.provider.upsert({
          where: {
            userId_provider: {
              userId: user.id,
              provider: 'sleeper',
            },
          },
          update: {
            providerUsername: username,
            providerUserId: sleeperUserId,
          },
          create: {
            userId: user.id,
            provider: 'sleeper',
            providerUsername: username,
            providerUserId: sleeperUserId,
          },
        });

        // Process each league
        for (const league of leagues) {
          // Create or update league
          const dbLeague = await tx.league.upsert({
            where: { providerLeagueId: league.league_id },
            update: {
              name: league.name,
              season: parseInt(league.season),
              sport: league.sport,
            },
            create: {
              provider: 'sleeper',
              providerLeagueId: league.league_id,
              name: league.name,
              season: parseInt(league.season),
              sport: league.sport,
            },
          });

          // Get rosters to find user's team ID
          const rosters = await this.sleeperClient.getRosters(league.league_id);
          const userRoster = rosters.find(roster => roster.owner_id === sleeperUserId);
          
          if (userRoster) {
            // Create or update user league association
            await tx.userLeague.upsert({
              where: {
                userId_leagueId: {
                  userId: user.id,
                  leagueId: dbLeague.id,
                },
              },
              update: {
                teamId: userRoster.roster_id.toString(),
              },
              create: {
                userId: user.id,
                leagueId: dbLeague.id,
                teamId: userRoster.roster_id.toString(),
              },
            });

            // Create default alert preferences
            await tx.alertPref.upsert({
              where: {
                userId_leagueId: {
                  userId: user.id,
                  leagueId: dbLeague.id,
                },
              },
              update: {},
              create: {
                userId: user.id,
                leagueId: dbLeague.id,
                pregame: true,
                scoring: true,
                waivers: true,
              },
            });
          }
        }
      });

      logger.info({
        tgUserId: tgUserId.toString(),
        username,
        leaguesCount: leagues.length,
      }, 'User Sleeper data synced successfully');

      // Check for scheduled drafts and return league info
      const scheduledDrafts = await this.checkForScheduledDrafts(leagues);
      
      // Return all leagues with draft info if available
      return leagues.map(league => ({
        leagueName: league.name,
        startTime: scheduledDrafts.find(d => d.leagueName === league.name)?.startTime || 'Драфт завершено'
      }));

    } catch (error) {
      logger.error({
        tgUserId: tgUserId.toString(),
        username,
        error: error instanceof Error ? error.message : error,
      }, 'Failed to sync user Sleeper data');
      throw error;
    }
  }

  /**
   * Check for scheduled drafts in newly synced leagues
   */
  private async checkForScheduledDrafts(leagues: any[]): Promise<Array<{
    leagueName: string;
    startTime: string;
  }>> {
    const scheduledDrafts = [];

    for (const league of leagues) {
      try {
        const drafts = await this.sleeperClient.getDrafts(league.league_id);
        
        for (const draft of drafts) {
          // Check if draft is scheduled (not started yet)
          if (draft.status === 'pre_draft' && draft.start_time) {
            const startTime = new Date(draft.start_time);
            const now = new Date();
            
            // Only include drafts that are in the future
            if (startTime > now) {
              scheduledDrafts.push({
                leagueName: league.name,
                startTime: startTime.toLocaleString('uk-UA'),
              });
            }
          }
        }
      } catch (error) {
        logger.error({
          leagueId: league.league_id,
          error: error instanceof Error ? error.message : error,
        }, 'Error checking drafts for league');
      }
    }

    return scheduledDrafts;
  }

  /**
   * Get user's leagues
   */
  async getUserLeagues(tgUserId: bigint): Promise<UserLeagueInfo[]> {
    const user = await prisma.user.findUnique({
      where: { tgUserId },
      include: {
        leagues: {
          include: {
            league: true,
          },
        },
        alerts: {
          include: {
            league: true,
          },
        },
      },
    });

    if (!user) {
      return [];
    }

    const result = [];
    
    for (const userLeague of user.leagues) {
      const alerts = user.alerts.find(alert => alert.leagueId === userLeague.leagueId);
      
      let teamName = `Team ${userLeague.teamId}`;
      let standing: number | undefined;
      
      try {
        // Get roster data to calculate standing and better team name
        const rosters = await this.sleeperClient.getRosters(userLeague.league.providerLeagueId);
        const userRoster = rosters.find(r => r.roster_id.toString() === userLeague.teamId);
        
        if (userRoster) {
          // Calculate standing based on wins/losses
          const sortedRosters = rosters.sort((a, b) => {
            const aWinPct = a.settings.wins / Math.max(1, a.settings.wins + a.settings.losses + a.settings.ties);
            const bWinPct = b.settings.wins / Math.max(1, b.settings.wins + b.settings.losses + b.settings.ties);
            
            if (aWinPct !== bWinPct) return bWinPct - aWinPct;
            return b.settings.fpts - a.settings.fpts;
          });
          
          standing = sortedRosters.findIndex(r => r.roster_id === userRoster.roster_id) + 1;
          teamName = `${standing}. Team ${userLeague.teamId} (${userRoster.settings.wins}-${userRoster.settings.losses})`;
        }
      } catch (error) {
        logger.error({
          leagueId: userLeague.leagueId,
          error: error instanceof Error ? error.message : error,
        }, 'Failed to get team info for league');
      }
      
      result.push({
        leagueId: userLeague.leagueId,
        name: userLeague.league.name,
        season: userLeague.league.season,
        sport: userLeague.league.sport,
        teamId: userLeague.teamId,
        teamName,
        standing,
        alertsEnabled: {
          pregame: alerts?.pregame || false,
          scoring: alerts?.scoring || false,
          waivers: alerts?.waivers || false,
        },
      });
    }
    
    return result;
  }

  /**
   * Generate week digest for user
   */
  async getWeekDigest(tgUserId: bigint, week?: number): Promise<DigestMessage[]> {
    try {
      // Get current week if not specified
      let currentWeek = week;
      if (!currentWeek) {
        const state = await this.sleeperClient.getState('nfl');
        currentWeek = state?.week || 1;
      }

      const userLeagues = await this.getUserLeagues(tgUserId);
      if (userLeagues.length === 0) {
        return [];
      }

      const digests: DigestMessage[] = [];

      for (const userLeague of userLeagues) {
        try {
          const digest = await this.generateLeagueDigest(
            userLeague.leagueId,
            userLeague.teamId,
            currentWeek
          );
          
          if (digest) {
            digests.push({
              ...digest,
              league: userLeague.name,
              week: currentWeek,
            });
          }
        } catch (error) {
          logger.error({
            leagueId: userLeague.leagueId,
            teamId: userLeague.teamId,
            week: currentWeek,
            error: error instanceof Error ? error.message : error,
          }, 'Failed to generate league digest');
        }
      }

      return digests;
    } catch (error) {
      logger.error({
        tgUserId: tgUserId.toString(),
        week,
        error: error instanceof Error ? error.message : error,
      }, 'Failed to get week digest');
      throw error;
    }
  }

  /**
   * Generate digest for a specific league
   */
  private async generateLeagueDigest(
    leagueId: number,
    teamId: string,
    week: number
  ): Promise<Omit<DigestMessage, 'league' | 'week'> | null> {
    try {
      // Get league from database
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
      });

      if (!league) {
        return null;
      }

      // Try to get cached matchups first
      const cachedMatchups = await this.getCachedMatchups(leagueId, week);
      let matchups = cachedMatchups?.payload as any[];

      // If not cached or stale, fetch fresh data
      if (!matchups) {
        matchups = await this.sleeperClient.getMatchups(league.providerLeagueId, week);
        
        // Cache the results
        if (matchups.length > 0) {
          await this.cacheMatchups(leagueId, week, matchups);
        }
      }

      if (!matchups || matchups.length === 0) {
        return {
          team: `Team ${teamId}`,
          topPlayers: [],
          upcomingGames: [],
          reminders: [t('waiver_reminder'), t('lineup_reminder')],
        };
      }

      // Find user's matchup
      const userMatchup = matchups.find(m => m.roster_id.toString() === teamId);
      if (!userMatchup) {
        return null;
      }

      // Find opponent
      const opponentMatchup = matchups.find(
        m => m.matchup_id === userMatchup.matchup_id && m.roster_id.toString() !== teamId
      );

      // Get top players with their real names
      const topPlayers = await this.getTopPlayersFromMatchup(userMatchup);

      // Generate reminders
      const reminders = [t('waiver_reminder'), t('lineup_reminder')];

      return {
        team: `Team ${teamId}`,
        opponent: opponentMatchup ? `Team ${opponentMatchup.roster_id}` : undefined,
        myScore: Math.round(userMatchup.points * 100) / 100,
        oppScore: opponentMatchup ? Math.round(opponentMatchup.points * 100) / 100 : undefined,
        topPlayers,
        upcomingGames: [], // Would need additional API calls to get game schedules
        reminders,
      };
    } catch (error) {
      logger.error({
        leagueId,
        teamId,
        week,
        error: error instanceof Error ? error.message : error,
      }, 'Failed to generate league digest');
      return null;
    }
  }

  /**
   * Get top players from matchup data
   */
  private async getTopPlayersFromMatchup(matchup: any): Promise<string[]> {
    if (!matchup.players_points) {
      return [];
    }

    try {
      // Get all NFL players data
      const players = await this.sleeperClient.getPlayers('nfl');

      // Sort players by points and take top 3
      const playerEntries = Object.entries(matchup.players_points) as [string, number][];
      const topPlayers = playerEntries
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([playerId, points]) => {
          const player = players[playerId];
          const playerName = player 
            ? `${player.first_name} ${player.last_name}` 
            : `Player ${playerId}`;
          return `${playerName}: ${Math.round(points * 100) / 100}pts`;
        });

      return topPlayers;
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : error,
      }, 'Failed to get player names for top players');
      
      // Fallback to player IDs if API fails
      const playerEntries = Object.entries(matchup.players_points) as [string, number][];
      return playerEntries
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([playerId, points]) => `Player ${playerId}: ${Math.round(points * 100) / 100}pts`);
    }
  }

  /**
   * Cache matchups data
   */
  private async cacheMatchups(leagueId: number, week: number, matchups: any[]): Promise<void> {
    await prisma.matchupsCache.upsert({
      where: {
        leagueId_week: {
          leagueId,
          week,
        },
      },
      update: {
        payload: matchups,
        fetchedAt: new Date(),
      },
      create: {
        leagueId,
        week,
        payload: matchups,
      },
    });
  }

  /**
   * Get cached matchups
   */
  private async getCachedMatchups(leagueId: number, week: number): Promise<{ payload: any } | null> {
    const cached = await prisma.matchupsCache.findUnique({
      where: {
        leagueId_week: {
          leagueId,
          week,
        },
      },
    });

    // Return cached data if it's less than 5 minutes old
    if (cached && Date.now() - cached.fetchedAt.getTime() < 5 * 60 * 1000) {
      return { payload: cached.payload };
    }

    return null;
  }

  /**
   * Refresh league week data
   */
  async refreshLeagueWeek(leagueId: number, week: number): Promise<void> {
    try {
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
      });

      if (!league) {
        throw new Error('League not found');
      }

      const matchups = await this.sleeperClient.getMatchups(league.providerLeagueId, week);
      await this.cacheMatchups(leagueId, week, matchups);

      logger.info({
        leagueId,
        week,
        matchupsCount: matchups.length,
      }, 'League week data refreshed');

    } catch (error) {
      logger.error({
        leagueId,
        week,
        error: error instanceof Error ? error.message : error,
      }, 'Failed to refresh league week data');
      throw error;
    }
  }

  /**
   * Update user alert preferences
   */
  async updateAlertPreferences(
    tgUserId: bigint,
    leagueId: number,
    preferences: { pregame?: boolean; scoring?: boolean; waivers?: boolean }
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { tgUserId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await prisma.alertPref.upsert({
      where: {
        userId_leagueId: {
          userId: user.id,
          leagueId,
        },
      },
      update: preferences,
      create: {
        userId: user.id,
        leagueId,
        pregame: preferences.pregame ?? true,
        scoring: preferences.scoring ?? true,
        waivers: preferences.waivers ?? true,
      },
    });

    logger.info({
      tgUserId: tgUserId.toString(),
      leagueId,
      preferences,
    }, 'Alert preferences updated');
  }

  /**
   * Remove user from league
   */
  async removeUserLeague(tgUserId: bigint, leagueId: number): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { tgUserId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await prisma.$transaction(async (tx) => {
      // Remove alert preferences
      await tx.alertPref.deleteMany({
        where: {
          userId: user.id,
          leagueId,
        },
      });

      // Remove user league association
      await tx.userLeague.deleteMany({
        where: {
          userId: user.id,
          leagueId,
        },
      });
    });

    logger.info({
      tgUserId: tgUserId.toString(),
      leagueId,
    }, 'User removed from league');
  }

  /**
   * Update user timezone
   */
  async updateUserTimezone(tgUserId: bigint, timezone: string): Promise<void> {
    await prisma.user.upsert({
      where: { tgUserId },
      update: { tz: timezone },
      create: {
        tgUserId,
        tz: timezone,
        lang: 'uk',
      },
    });

    logger.info({
      tgUserId: tgUserId.toString(),
      timezone,
    }, 'User timezone updated');
  }

  /**
   * Get users for daily digest (with their timezone)
   */
  async getUsersForDailyDigest(): Promise<Array<{ tgUserId: bigint; timezone: string }>> {
    const users = await prisma.user.findMany({
      where: {
        leagues: {
          some: {}, // Users with at least one league
        },
      },
      select: {
        tgUserId: true,
        tz: true,
      },
    });

    return users.map(user => ({
      tgUserId: user.tgUserId,
      timezone: user.tz,
    }));
  }
}