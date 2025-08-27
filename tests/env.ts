// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.TELEGRAM_TOKEN = '7977291846:AAGEDCQkNT7ZraeCsbzNHoobO25dCYYqsJI';
process.env.SLEEPER_API_BASE = 'https://api.sleeper.app/v1';
process.env.TIMEZONE = 'Europe/Brussels';
process.env.PORT = '8080';
