import { Router, Request, Response } from 'express';
import { FantasyService } from '../../services/fantasy-service';
import { t } from '../../i18n';
import pino from 'pino';
import { z } from 'zod';

const logger = pino({ name: 'api:leagues' });
const router = Router();
const fantasyService = new FantasyService();

// Validation schemas
const refreshSchema = z.object({
  week: z.number().min(1).max(18),
});

/**
 * Force refresh league week data
 */
router.post('/leagues/:leagueId/refresh', async (req: Request, res: Response) => {
  try {
    const leagueId = parseInt(req.params.leagueId);
    
    if (isNaN(leagueId)) {
      return res.status(400).json({
        error: t('api_invalid_request'),
        details: 'Invalid league ID',
      });
    }

    // Validate request body
    const validation = refreshSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: t('api_invalid_request'),
        details: validation.error.errors,
      });
    }

    const { week } = validation.data;

    logger.info({
      leagueId,
      week,
    }, 'API request to refresh league data');

    await fantasyService.refreshLeagueWeek(leagueId, week);

    res.json({
      success: true,
      message: 'League data refreshed successfully',
      data: {
        leagueId,
        week,
        refreshedAt: new Date().toISOString(),
      },
    });

    logger.info({
      leagueId,
      week,
    }, 'League data refreshed successfully via API');

  } catch (error) {
    logger.error({
      leagueId: req.params.leagueId,
      week: req.body.week,
      error: error instanceof Error ? error.message : error,
    }, 'API error refreshing league data');

    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    const errorMessage = error instanceof Error ? error.message : t('error_generic');

    res.status(statusCode).json({
      error: errorMessage,
      success: false,
    });
  }
});

/**
 * Get league information (basic endpoint for future expansion)
 */
router.get('/leagues/:leagueId', async (req: Request, res: Response) => {
  try {
    const leagueId = parseInt(req.params.leagueId);
    
    if (isNaN(leagueId)) {
      return res.status(400).json({
        error: t('api_invalid_request'),
        details: 'Invalid league ID',
      });
    }

    logger.info({
      leagueId,
    }, 'API request to get league info');

    // For now, this is a placeholder - we'd need to implement league lookup
    // In a full implementation, we'd fetch league data from database and Sleeper
    
    res.status(501).json({
      error: 'Not implemented yet',
      message: 'League info endpoint will be available in future version',
      success: false,
    });

  } catch (error) {
    logger.error({
      leagueId: req.params.leagueId,
      error: error instanceof Error ? error.message : error,
    }, 'API error getting league info');

    res.status(500).json({
      error: t('error_generic'),
      success: false,
    });
  }
});

export { router as leaguesRouter };