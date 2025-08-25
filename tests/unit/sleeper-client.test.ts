import axios from 'axios';
import { SleeperClient } from '../../src/services/sleeper-client';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SleeperClient', () => {
  let client: SleeperClient;

  beforeEach(() => {
    client = new SleeperClient();
    jest.clearAllMocks();
    
    // Setup axios mock
    mockedAxios.create.mockReturnValue(mockedAxios);
    mockedAxios.interceptors = {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    } as any;
  });

  describe('getUserIdByUsername', () => {
    it('should return user ID for valid username', async () => {
      const mockUser = {
        user_id: '123456789',
        username: 'test_user',
        display_name: 'Test User',
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockUser });

      const result = await client.getUserIdByUsername('test_user');

      expect(result).toBe('123456789');
      expect(mockedAxios.get).toHaveBeenCalledWith('/user/test_user');
    });

    it('should return null for non-existent username', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 404 },
      });

      const result = await client.getUserIdByUsername('non_existent_user');

      expect(result).toBeNull();
    });

    it('should cache results', async () => {
      const mockUser = {
        user_id: '123456789',
        username: 'test_user',
        display_name: 'Test User',
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockUser });

      // First call
      await client.getUserIdByUsername('test_user');
      // Second call should use cache
      const result = await client.getUserIdByUsername('test_user');

      expect(result).toBe('123456789');
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUserLeagues', () => {
    it('should return user leagues for valid user ID', async () => {
      const mockLeagues = [
        {
          league_id: 'league1',
          name: 'Test League 1',
          season: '2024',
          sport: 'nfl',
          status: 'in_season',
          roster_positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF'],
          scoring_settings: { pass_td: 4 },
          settings: { playoff_week_start: 15, playoff_round_type: 2 },
        },
        {
          league_id: 'league2',
          name: 'Test League 2',
          season: '2024',
          sport: 'nfl',
          status: 'in_season',
          roster_positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF'],
          scoring_settings: { pass_td: 6 },
          settings: { playoff_week_start: 15, playoff_round_type: 2 },
        },
      ];

      mockedAxios.get.mockResolvedValueOnce({ data: mockLeagues });

      const result = await client.getUserLeagues('123456789');

      expect(result).toHaveLength(2);
      expect(result[0].league_id).toBe('league1');
      expect(result[1].league_id).toBe('league2');
      expect(mockedAxios.get).toHaveBeenCalledWith('/user/123456789/leagues/nfl/2024');
    });

    it('should handle custom sport and season', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: [] });

      await client.getUserLeagues('123456789', 'nba', '2023');

      expect(mockedAxios.get).toHaveBeenCalledWith('/user/123456789/leagues/nba/2023');
    });
  });

  describe('getMatchups', () => {
    it('should return matchups for league and week', async () => {
      const mockMatchups = [
        {
          roster_id: 1,
          matchup_id: 1,
          points: 98.5,
          players_points: { '421': 18.5, '422': 12.3 },
          starters_points: [18.5, 12.3],
        },
        {
          roster_id: 2,
          matchup_id: 1,
          points: 87.2,
          players_points: { '423': 15.2, '424': 9.8 },
          starters_points: [15.2, 9.8],
        },
      ];

      mockedAxios.get.mockResolvedValueOnce({ data: mockMatchups });

      const result = await client.getMatchups('league1', 10);

      expect(result).toHaveLength(2);
      expect(result[0].points).toBe(98.5);
      expect(result[1].points).toBe(87.2);
      expect(mockedAxios.get).toHaveBeenCalledWith('/league/league1/matchups/10');
    });
  });

  describe('getState', () => {
    it('should return NFL state information', async () => {
      const mockState = {
        sport: 'nfl',
        league_season: '2024',
        week: 10,
        season_type: 'regular',
        leg: 1,
        previous_season: '2023',
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockState });

      const result = await client.getState();

      expect(result).toEqual(mockState);
      expect(result?.week).toBe(10);
      expect(mockedAxios.get).toHaveBeenCalledWith('/state/nfl');
    });

    it('should handle different sports', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: null });

      await client.getState('nba');

      expect(mockedAxios.get).toHaveBeenCalledWith('/state/nba');
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

      await expect(client.getUserIdByUsername('test_user')).rejects.toThrow('Network Error');
    });

    it('should handle 500 errors', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 500, statusText: 'Internal Server Error' },
      });

      await expect(client.getUserIdByUsername('test_user')).rejects.toMatchObject({
        response: { status: 500 },
      });
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      client.clearCache();
      
      const stats = client.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should provide cache statistics', () => {
      const stats = client.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(typeof stats.size).toBe('number');
    });
  });
});