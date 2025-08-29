import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Simple health check that doesn't depend on database
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    message: 'Sleeper NFL Bot is running'
  });
});

// Root endpoint - should show something in browser
router.get('/', (req: Request, res: Response) => {
  res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Sleeper NFL Bot</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
            .status { color: #28a745; font-weight: bold; }
            .code { background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🏈 Sleeper NFL Bot</h1>
            <p class="status">✅ Bot is running successfully!</p>
            
            <h3>📱 How to use:</h3>
            <ol>
                <li>Add the bot to Telegram: <strong>@your_bot_name</strong></li>
                <li>Send <code>/start</code> to begin</li>
                <li>Use <code>/link_sleeper &lt;username&gt;</code> to connect your Sleeper account</li>
                <li>Get daily digests with <code>/today</code></li>
            </ol>
            
            <h3>🔧 API Endpoints:</h3>
            <ul>
                <li><code>GET /health</code> - Simple health check</li>
                <li><code>GET /healthz</code> - Full health check with database</li>
                <li><code>POST /api/v1/users/{id}/link-sleeper</code> - Link Sleeper account</li>
            </ul>
            
            <p><small>Deployed at: ${new Date().toISOString()}</small></p>
        </div>
    </body>
    </html>
  `);
});

export { router as simpleHealthRouter };