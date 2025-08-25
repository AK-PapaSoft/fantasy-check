// Global test setup
import pino from 'pino';

// Suppress logs during tests unless LOG_LEVEL is set
if (!process.env.LOG_LEVEL) {
  pino.final = () => {};
}

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};