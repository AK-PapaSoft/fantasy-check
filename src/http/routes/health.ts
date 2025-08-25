import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../../db';
import pino from 'pino';

const logger = pino({ name: 'api:health' });
const router = Router();

interface HealthResponse {
  status: string;
  uptime: number;
  version: string;
  database: boolean;
  timestamp: string;
}

/**
 * Health check endpoint
 */
router.get('/healthz', async (req: Request, res: Response) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    
    const health: HealthResponse = {
      status: dbHealth ? 'ok' : 'degraded',
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      database: dbHealth,
      timestamp: new Date().toISOString(),
    };

    const statusCode = dbHealth ? 200 : 503;
    res.status(statusCode).json(health);

    if (!dbHealth) {
      logger.warn('Health check failed: database unhealthy');
    }

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : error,
    }, 'Health check error');

    res.status(500).json({
      status: 'error',
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      database: false,
      timestamp: new Date().toISOString(),
      error: 'Internal server error',
    });
  }
});

export { router as healthRouter };