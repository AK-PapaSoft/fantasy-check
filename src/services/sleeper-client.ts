import axios, { AxiosInstance, AxiosError } from 'axios';
import pino from 'pino';

const logger = pino({ name: 'sleeper-client' });

// Types for Sleeper API responses
export interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar?: string;
}

export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  sport: string;
  status: string;
  roster_positions: string[];
  scoring_settings: Record<string, number>;
  settings: {
    playoff_week_start: number;
    playoff_round_type: number;
  };
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string;
  league_id: string;
  players: string[];
  starters: string[];
  settings: {
    wins: number;
    losses: number;
    ties: number;
    fpts: number;
    fpts_against: number;
  };
}

export interface SleeperMatchup {
  roster_id: number;
  matchup_id: number;
  points: number;
  players_points: Record<string, number>;
  starters_points: number[];
}

export interface SleeperState {
  sport: string;
  league_season: string;
  week: number;
  season_type: string;
  leg: number;
  previous_season: string;
}

// Cache interface
interface CacheEntry<T> {
  data: T;
  expires: number;
}

// In-memory cache with TTL
class InMemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 60 * 1000; // 60 seconds

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export class SleeperClient {
  private readonly http: AxiosInstance;
  private readonly cache: InMemoryCache;
  private readonly baseURL: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(
    baseURL: string = process.env.SLEEPER_API_BASE || 'https://api.sleeper.app/v1',
    timeout: number = 10000,
    maxRetries: number = 3
  ) {
    this.baseURL = baseURL;
    this.timeout = timeout;
    this.maxRetries = maxRetries;
    this.cache = new InMemoryCache();

    this.http = axios.create({
      baseURL,
      timeout,
      headers: {
        'User-Agent': 'sleeper-nfl-bot/1.0.0',
        'Accept': 'application/json',
      },
    });

    // Request interceptor for logging
    this.http.interceptors.request.use(
      (config) => {
        logger.info({
          method: config.method?.toUpperCase(),
          url: config.url,
        }, 'Making Sleeper API request');
        return config;
      },
      (error) => {
        logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.http.interceptors.response.use(
      (response) => {
        logger.info({
          status: response.status,
          url: response.config.url,
        }, 'Sleeper API response received');
        return response;
      },
      (error) => {
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  private handleError(error: AxiosError): void {
    if (error.response) {
      logger.error({
        status: error.response.status,
        statusText: error.response.statusText,
        url: error.config?.url,
        data: error.response.data,
      }, 'Sleeper API error response');
    } else if (error.request) {
      logger.error({
        url: error.config?.url,
        message: error.message,
      }, 'Sleeper API request error');
    } else {
      logger.error({
        message: error.message,
      }, 'Sleeper API unknown error');
    }
  }

  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error as AxiosError)) {
        logger.warn(`Retrying request. ${retries} attempts left`);
        await this.sleep(1000 * (this.maxRetries - retries + 1)); // Exponential backoff
        return this.retryRequest(requestFn, retries - 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: AxiosError): boolean {
    if (!error.response) return true; // Network error
    
    const status = error.response.status;
    return status >= 500 || status === 429; // Server error or rate limit
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get user ID by username
   */
  async getUserIdByUsername(username: string): Promise<string | null> {
    const cacheKey = `user:${username}`;
    const cached = this.cache.get<SleeperUser>(cacheKey);
    
    if (cached) {
      return cached.user_id;
    }

    try {
      const response = await this.retryRequest(
        () => this.http.get<SleeperUser>(`/user/${username}`)
      );

      if (response.data) {
        this.cache.set(cacheKey, response.data, 300000); // 5 minutes
        return response.data.user_id;
      }
      
      return null;
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get user leagues by user ID
   */
  async getUserLeagues(
    userId: string,
    sport: string = 'nfl',
    season?: string
  ): Promise<SleeperLeague[]> {
    const currentSeason = season || new Date().getFullYear().toString();
    const cacheKey = `leagues:${userId}:${sport}:${currentSeason}`;
    const cached = this.cache.get<SleeperLeague[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await this.retryRequest(
        () => this.http.get<SleeperLeague[]>(`/user/${userId}/leagues/${sport}/${currentSeason}`)
      );

      const leagues = response.data || [];
      this.cache.set(cacheKey, leagues, 120000); // 2 minutes
      return leagues;
    } catch (error) {
      logger.error({ userId, sport, season: currentSeason }, 'Failed to get user leagues');
      throw error;
    }
  }

  /**
   * Get rosters for a league
   */
  async getRosters(leagueId: string): Promise<SleeperRoster[]> {
    const cacheKey = `rosters:${leagueId}`;
    const cached = this.cache.get<SleeperRoster[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await this.retryRequest(
        () => this.http.get<SleeperRoster[]>(`/league/${leagueId}/rosters`)
      );

      const rosters = response.data || [];
      this.cache.set(cacheKey, rosters, 120000); // 2 minutes
      return rosters;
    } catch (error) {
      logger.error({ leagueId }, 'Failed to get league rosters');
      throw error;
    }
  }

  /**
   * Get matchups for a league and week
   */
  async getMatchups(leagueId: string, week: number): Promise<SleeperMatchup[]> {
    const cacheKey = `matchups:${leagueId}:${week}`;
    const cached = this.cache.get<SleeperMatchup[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await this.retryRequest(
        () => this.http.get<SleeperMatchup[]>(`/league/${leagueId}/matchups/${week}`)
      );

      const matchups = response.data || [];
      this.cache.set(cacheKey, matchups, 60000); // 1 minute for live data
      return matchups;
    } catch (error) {
      logger.error({ leagueId, week }, 'Failed to get league matchups');
      throw error;
    }
  }

  /**
   * Get NFL state (current week/season info)
   */
  async getState(sport: string = 'nfl'): Promise<SleeperState | null> {
    const cacheKey = `state:${sport}`;
    const cached = this.cache.get<SleeperState>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await this.retryRequest(
        () => this.http.get<SleeperState>(`/state/${sport}`)
      );

      if (response.data) {
        this.cache.set(cacheKey, response.data, 300000); // 5 minutes
        return response.data;
      }
      
      return null;
    } catch (error) {
      logger.error({ sport }, 'Failed to get sport state');
      throw error;
    }
  }

  /**
   * Get league details
   */
  async getLeague(leagueId: string): Promise<SleeperLeague | null> {
    const cacheKey = `league:${leagueId}`;
    const cached = this.cache.get<SleeperLeague>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await this.retryRequest(
        () => this.http.get<SleeperLeague>(`/league/${leagueId}`)
      );

      if (response.data) {
        this.cache.set(cacheKey, response.data, 300000); // 5 minutes
        return response.data;
      }
      
      return null;
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Sleeper client cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number } {
    return {
      size: this.cache.size(),
    };
  }
}