import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health';
import { simpleHealthRouter } from './routes/simple-health';
import { usersRouter } from './routes/users';
import { leaguesRouter } from './routes/leagues';
import pino from 'pino';

const logger = pino({ name: 'http-server' });

export class HttpServer {
  private app: Express;
  private readonly port: number;

  constructor(port: number = 8080) {
    this.port = port;
    this.app = express();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // CORS configuration
    const corsOptions = {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.APP_BASE_URL ? [process.env.APP_BASE_URL] : false
        : true, // Allow all origins in development
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    };

    this.app.use(cors(corsOptions));

    // Body parsing
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      
      // Log request
      logger.info({
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
      }, 'HTTP request received');

      // Log response when finished
      res.on('finish', () => {
        const duration = Date.now() - start;
        
        logger.info({
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration: `${duration}ms`,
        }, 'HTTP request completed');
      });

      next();
    });

    logger.info('HTTP middleware setup completed');
  }

  private setupRoutes(): void {
    // Simple health and root routes
    this.app.use('/', simpleHealthRouter);
    
    // Health check (no /api prefix for load balancer)
    this.app.use('/', healthRouter);

    // API routes
    this.app.use('/api/v1', usersRouter);
    this.app.use('/api/v1', leaguesRouter);

    // Webhook endpoint for Telegram (handled by bot instance)
    // This will be set up when integrating with the bot

    logger.info('HTTP routes setup completed');
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error({
        error: error.message,
        stack: error.stack,
        method: req.method,
        url: req.url,
      }, 'HTTP server error');

      // Don't expose error details in production
      const message = process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message;

      res.status(500).json({
        error: message,
        timestamp: new Date().toISOString(),
      });
    });

    logger.info('HTTP error handling setup completed');
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        logger.info({
          port: this.port,
          env: process.env.NODE_ENV,
        }, 'HTTP server started');
        resolve();
      });
    });
  }

  /**
   * Get Express app instance (for webhook integration)
   */
  getApp(): Express {
    return this.app;
  }

  /**
   * Add webhook path for Telegram bot
   */
  addWebhookPath(path: string, handler: any): void {
    this.app.post(path, handler);
    logger.info({ path }, 'Webhook path added');
  }

  /**
   * Add 404 handler (should be called after all routes including webhooks are set up)
   */
  add404Handler(): void {
    // 404 handler for unknown routes
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
      });
    });
    logger.info('404 handler added');
  }
}