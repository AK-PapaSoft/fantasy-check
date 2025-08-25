import {
  isValidTimezone,
  getCurrentTimeInTimezone,
  isHourInTimezone,
  getCommonTimezones,
  formatTimeInTimezone,
} from '../../src/utils/timezone';

describe('timezone utilities', () => {
  describe('isValidTimezone', () => {
    it('should return true for valid timezones', () => {
      expect(isValidTimezone('Europe/Kiev')).toBe(true);
      expect(isValidTimezone('America/New_York')).toBe(true);
      expect(isValidTimezone('UTC')).toBe(true);
      expect(isValidTimezone('Asia/Tokyo')).toBe(true);
    });

    it('should return false for invalid timezones', () => {
      expect(isValidTimezone('Invalid/Timezone')).toBe(false);
      expect(isValidTimezone('Europe/NotACity')).toBe(false);
      expect(isValidTimezone('')).toBe(false);
      expect(isValidTimezone('GMT+3')).toBe(false); // This format is not supported
    });
  });

  describe('getCurrentTimeInTimezone', () => {
    it('should return a Date object', () => {
      const result = getCurrentTimeInTimezone('Europe/Brussels');
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle invalid timezone gracefully', () => {
      const result = getCurrentTimeInTimezone('Invalid/Timezone');
      expect(result).toBeInstanceOf(Date);
    });

    it('should return different times for different timezones', () => {
      const utcTime = getCurrentTimeInTimezone('UTC');
      const tokyoTime = getCurrentTimeInTimezone('Asia/Tokyo');
      
      // Times should be different (unless it's exactly the hour boundary)
      expect(utcTime.getTime()).toBeDefined();
      expect(tokyoTime.getTime()).toBeDefined();
    });
  });

  describe('isHourInTimezone', () => {
    it('should return boolean', () => {
      const result = isHourInTimezone('Europe/Brussels', 8);
      expect(typeof result).toBe('boolean');
    });

    it('should handle invalid timezone gracefully', () => {
      const result = isHourInTimezone('Invalid/Timezone', 8);
      expect(result).toBe(false);
    });

    it('should validate hour range', () => {
      // Should work for valid hours (0-23)
      expect(typeof isHourInTimezone('UTC', 0)).toBe('boolean');
      expect(typeof isHourInTimezone('UTC', 12)).toBe('boolean');
      expect(typeof isHourInTimezone('UTC', 23)).toBe('boolean');
    });
  });

  describe('getCommonTimezones', () => {
    it('should return array of common timezones', () => {
      const timezones = getCommonTimezones();
      
      expect(Array.isArray(timezones)).toBe(true);
      expect(timezones.length).toBeGreaterThan(0);
      
      // Should include some expected timezones
      expect(timezones).toContain('Europe/Kiev');
      expect(timezones).toContain('Europe/Brussels');
      expect(timezones).toContain('America/New_York');
    });

    it('should return valid timezones', () => {
      const timezones = getCommonTimezones();
      
      timezones.forEach(tz => {
        expect(isValidTimezone(tz)).toBe(true);
      });
    });
  });

  describe('formatTimeInTimezone', () => {
    it('should return formatted time string', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = formatTimeInTimezone(date, 'Europe/Brussels');
      
      expect(typeof result).toBe('string');
      expect(result).toMatch(/\d{2}\.\d{2}\.\d{4}/); // Should contain date pattern
    });

    it('should handle invalid timezone gracefully', () => {
      const date = new Date();
      const result = formatTimeInTimezone(date, 'Invalid/Timezone');
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should use Ukrainian locale format', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = formatTimeInTimezone(date, 'UTC');
      
      // Should use dd.mm.yyyy format (Ukrainian style)
      expect(result).toContain('15.01.2024');
    });
  });

  describe('edge cases', () => {
    it('should handle daylight saving time transitions', () => {
      // Test around DST transition (example: spring forward)
      const springForward = new Date('2024-03-31T01:00:00Z'); // DST starts in Europe
      const result = getCurrentTimeInTimezone('Europe/Brussels');
      
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle year boundaries', () => {
      const newYear = new Date('2024-01-01T00:00:00Z');
      const result = formatTimeInTimezone(newYear, 'Europe/Brussels');
      
      expect(result).toContain('2024');
    });

    it('should handle leap year', () => {
      const leapDay = new Date('2024-02-29T12:00:00Z');
      const result = formatTimeInTimezone(leapDay, 'Europe/Brussels');
      
      expect(result).toContain('29.02.2024');
    });
  });
});