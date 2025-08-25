import { Router, Request, Response } from 'express';
import { FantasyService } from '../../services/fantasy-service';
import { t } from '../../i18n';
import pino from 'pino';
import { z } from 'zod';

const logger = pino({ name: 'api:users' });
const router = Router();
const fantasyService = new FantasyService();

// Validation schemas
const linkSleeperSchema = z.object({
  username: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Invalid username format'),
});

const digestSchema = z.object({
  week: z.number().min(1).max(18).optional(),
});

/**
 * Link Sleeper account
 */
router.post('/users/:tgUserId/link-sleeper', async (req: Request, res: Response) => {
  try {
    const tgUserId = BigInt(req.params.tgUserId);
    
    // Validate request body
    const validation = linkSleeperSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: t('api_invalid_request'),
        details: validation.error.errors,
      });
    }

    const { username } = validation.data;

    logger.info({
      tgUserId: tgUserId.toString(),
      username,
    }, 'API request to link Sleeper account');

    await fantasyService.syncUserSleeper(tgUserId, username);
    
    const leagues = await fantasyService.getUserLeagues(tgUserId);

    res.json({
      success: true,
      message: t('linked_ok', { username }),
      data: {
        username,
        leaguesCount: leagues.length,
        leagues: leagues.map(league => ({
          id: league.leagueId,
          name: league.name,
          season: league.season,
          sport: league.sport,
          teamId: league.teamId,
        })),
      },
    });

    logger.info({
      tgUserId: tgUserId.toString(),
      username,
      leaguesCount: leagues.length,
    }, 'Sleeper account linked successfully via API');

  } catch (error) {
    logger.error({
      tgUserId: req.params.tgUserId,
      error: error instanceof Error ? error.message : error,
    }, 'API error linking Sleeper account');

    const errorMessage = error instanceof Error ? error.message : t('error_generic');
    
    res.status(400).json({
      error: errorMessage,
      success: false,
    });
  }
});

/**
 * Get user leagues
 */
router.get('/users/:tgUserId/leagues', async (req: Request, res: Response) => {
  try {
    const tgUserId = BigInt(req.params.tgUserId);

    logger.info({
      tgUserId: tgUserId.toString(),
    }, 'API request to get user leagues');

    const leagues = await fantasyService.getUserLeagues(tgUserId);

    res.json({
      success: true,
      data: {
        leagues: leagues.map(league => ({
          id: league.leagueId,
          name: league.name,
          season: league.season,
          sport: league.sport,
          teamId: league.teamId,
          alerts: league.alertsEnabled,
        })),
        count: leagues.length,
      },
    });

  } catch (error) {
    logger.error({
      tgUserId: req.params.tgUserId,
      error: error instanceof Error ? error.message : error,
    }, 'API error getting user leagues');

    res.status(500).json({
      error: t('error_generic'),
      success: false,
    });
  }
});

/**
 * Get user digest
 */
router.post('/users/:tgUserId/digest', async (req: Request, res: Response) => {
  try {
    const tgUserId = BigInt(req.params.tgUserId);
    
    // Validate request body
    const validation = digestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: t('api_invalid_request'),
        details: validation.error.errors,
      });
    }

    const { week } = validation.data;

    logger.info({
      tgUserId: tgUserId.toString(),
      week,
    }, 'API request to get user digest');

    const digests = await fantasyService.getWeekDigest(tgUserId, week);

    // Format digests for web UI
    const formattedDigests = digests.map(digest => {
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

      return {
        league: digest.league,
        week: digest.week,
        message,
        data: {
          team: digest.team,
          opponent: digest.opponent,
          myScore: digest.myScore,
          oppScore: digest.oppScore,
          topPlayers: digest.topPlayers,
          upcomingGames: digest.upcomingGames,
          reminders: digest.reminders,
        },
      };
    });

    res.json({
      success: true,
      data: {
        digests: formattedDigests,
        count: formattedDigests.length,
        week: week || 'current',
      },
    });

  } catch (error) {
    logger.error({
      tgUserId: req.params.tgUserId,
      week: req.body.week,
      error: error instanceof Error ? error.message : error,
    }, 'API error getting user digest');

    res.status(500).json({
      error: t('error_generic'),
      success: false,
    });
  }
});

export { router as usersRouter };