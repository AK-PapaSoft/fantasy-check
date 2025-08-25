// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.TELEGRAM_TOKEN = 'test_telegram_token';
process.env.SLEEPER_API_BASE = 'https://api.sleeper.app/v1';
process.env.TIMEZONE = 'Europe/Brussels';
process.env.PORT = '8080';