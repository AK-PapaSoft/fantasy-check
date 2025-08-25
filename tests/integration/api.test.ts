import request from 'supertest';
import express from 'express';
import { healthRouter } from '../../src/http/routes/health';
import { usersRouter } from '../../src/http/routes/users';
import { leaguesRouter } from '../../src/http/routes/leagues';

// Mock dependencies
jest.mock('../../src/db', () => ({
  checkDatabaseHealth: jest.fn(),
}));

jest.mock('../../src/services/fantasy-service');

import { checkDatabaseHealth } from '../../src/db';

describe('API Integration Tests', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', healthRouter);
    app.use('/api/v1', usersRouter);
    app.use('/api/v1', leaguesRouter);
    
    jest.clearAllMocks();
  });

  describe('Health Check API', () => {
    it('should return 200 when healthy', async () => {
      (checkDatabaseHealth as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .get('/healthz')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        database: true,
      });
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return 503 when database is unhealthy', async () => {
      (checkDatabaseHealth as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .get('/healthz')
        .expect(503);

      expect(response.body).toMatchObject({
        status: 'degraded',
        database: false,
      });
    });

    it('should return 500 on database check error', async () => {
      (checkDatabaseHealth as jest.Mock).mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .get('/healthz')
        .expect(500);

      expect(response.body).toMatchObject({
        status: 'error',
        database: false,
      });
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Users API', () => {
    const mockFantasyService = () => {
      const FantasyService = require('../../src/services/fantasy-service').FantasyService;
      return FantasyService.prototype;
    };

    describe('POST /api/v1/users/:tgUserId/link-sleeper', () => {
      it('should link sleeper account successfully', async () => {
        const mockService = mockFantasyService();
        mockService.syncUserSleeper = jest.fn().mockResolvedValue(undefined);
        mockService.getUserLeagues = jest.fn().mockResolvedValue([
          {
            leagueId: 1,
            name: 'Test League',
            season: 2024,
            sport: 'nfl',
            teamId: '3',
          },
        ]);

        const response = await request(app)
          .post('/api/v1/users/123456789/link-sleeper')
          .send({ username: 'test_user' })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            username: 'test_user',
            leaguesCount: 1,
          },
        });
      });

      it('should validate username format', async () => {
        const response = await request(app)
          .post('/api/v1/users/123456789/link-sleeper')
          .send({ username: 'invalid username!' })
          .expect(400);

        expect(response.body).toMatchObject({
          error: expect.any(String),
          details: expect.any(Array),
        });
      });

      it('should require username', async () => {
        const response = await request(app)
          .post('/api/v1/users/123456789/link-sleeper')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/v1/users/:tgUserId/leagues', () => {
      it('should return user leagues', async () => {
        const mockService = mockFantasyService();
        mockService.getUserLeagues = jest.fn().mockResolvedValue([
          {
            leagueId: 1,
            name: 'Test League',
            season: 2024,
            sport: 'nfl',
            teamId: '3',
            alertsEnabled: {
              pregame: true,
              scoring: true,
              waivers: false,
            },
          },
        ]);

        const response = await request(app)
          .get('/api/v1/users/123456789/leagues')
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            leagues: expect.any(Array),
            count: 1,
          },
        });
      });
    });

    describe('POST /api/v1/users/:tgUserId/digest', () => {
      it('should return user digest', async () => {
        const mockService = mockFantasyService();
        mockService.getWeekDigest = jest.fn().mockResolvedValue([
          {
            league: 'Test League',
            week: 10,
            team: 'Team 3',
            opponent: 'Team 5',
            myScore: 98.5,
            oppScore: 87.2,
            topPlayers: ['player1: 18.5pts'],
            upcomingGames: [],
            reminders: ['Check waivers'],
          },
        ]);

        const response = await request(app)
          .post('/api/v1/users/123456789/digest')
          .send({ week: 10 })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            digests: expect.any(Array),
            count: 1,
            week: 10,
          },
        });
      });

      it('should validate week parameter', async () => {
        const response = await request(app)
          .post('/api/v1/users/123456789/digest')
          .send({ week: 25 }) // Invalid week
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('Leagues API', () => {
    const mockFantasyService = () => {
      const FantasyService = require('../../src/services/fantasy-service').FantasyService;
      return FantasyService.prototype;
    };

    describe('POST /api/v1/leagues/:leagueId/refresh', () => {
      it('should refresh league data successfully', async () => {
        const mockService = mockFantasyService();
        mockService.refreshLeagueWeek = jest.fn().mockResolvedValue(undefined);

        const response = await request(app)
          .post('/api/v1/leagues/1/refresh')
          .send({ week: 10 })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            leagueId: 1,
            week: 10,
          },
        });
      });

      it('should validate league ID', async () => {
        const response = await request(app)
          .post('/api/v1/leagues/invalid/refresh')
          .send({ week: 10 })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      it('should validate week parameter', async () => {
        const response = await request(app)
          .post('/api/v1/leagues/1/refresh')
          .send({ week: 0 }) // Invalid week
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      it('should require week parameter', async () => {
        const response = await request(app)
          .post('/api/v1/leagues/1/refresh')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/v1/leagues/:leagueId', () => {
      it('should return 501 not implemented', async () => {
        const response = await request(app)
          .get('/api/v1/leagues/1')
          .expect(501);

        expect(response.body).toMatchObject({
          error: 'Not implemented yet',
          success: false,
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/v1/unknown-endpoint')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Endpoint not found',
        path: '/api/v1/unknown-endpoint',
        method: 'GET',
      });
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/users/123/link-sleeper')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      // Express should handle this and return 400
      expect(response.status).toBe(400);
    });
  });
});