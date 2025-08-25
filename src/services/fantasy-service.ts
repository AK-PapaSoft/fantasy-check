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
  async syncUserSleeper(tgUserId: bigint, username: string): Promise<void> {
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
        // Create or update user
        const user = await tx.user.upsert({
          where: { tgUserId },
          update: {},
          create: {
            tgUserId,
            lang: 'uk',
            tz: process.env.TIMEZONE || 'Europe/Brussels',
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

    return user.leagues.map(userLeague => {
      const alerts = user.alerts.find(alert => alert.leagueId === userLeague.leagueId);
      
      return {
        leagueId: userLeague.leagueId,
        name: userLeague.league.name,
        season: userLeague.league.season,
        sport: userLeague.league.sport,
        teamId: userLeague.teamId,
        alertsEnabled: {
          pregame: alerts?.pregame || false,
          scoring: alerts?.scoring || false,
          waivers: alerts?.waivers || false,
        },
      };
    });
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

      // Get top players (simplified - just get player IDs with highest points)
      const topPlayers = this.getTopPlayersFromMatchup(userMatchup);

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
  private getTopPlayersFromMatchup(matchup: any): string[] {
    if (!matchup.players_points) {
      return [];
    }

    // Sort players by points and take top 3
    const playerEntries = Object.entries(matchup.players_points) as [string, number][];
    const topPlayers = playerEntries
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([playerId, points]) => `${playerId}: ${Math.round(points * 100) / 100}pts`);

    return topPlayers;
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