const express = require('express');
const { Telegraf } = require('telegraf');

const app = express();
app.use(express.json());

// Initialize bot
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

// Simple handlers for testing
bot.command('start', (ctx) => {
  console.log('START COMMAND RECEIVED - Express API');
  ctx.reply('✅ START working! Express API version: ' + new Date().toISOString());
});

bot.command('help', (ctx) => {
  console.log('HELP COMMAND RECEIVED - Express API');
  ctx.reply('✅ HELP working! Express API version: ' + new Date().toISOString());
});

// Webhook endpoint
app.post('/api/webhook', (req, res) => {
  console.log('Webhook received:', JSON.stringify(req.body, null, 2));
  bot.handleUpdate(req.body);
  res.json({ ok: true });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: 'Express API v1.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Fantasy Gather Bot API',
    version: 'Express v1.0',
    timestamp: new Date().toISOString()
  });
});

// For Vercel serverless
module.exports = app;

// For local development
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}