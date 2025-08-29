/**
 * Timezone validation utilities
 */

// Common timezones that users might use
const COMMON_TIMEZONES = [
  'Europe/Kiev',
  'Europe/Brussels',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

/**
 * Validate timezone string
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current time in specific timezone
 */
export function getCurrentTimeInTimezone(timezone: string): Date {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year')?.value || '2024';
    const month = parts.find(p => p.type === 'month')?.value || '01';
    const day = parts.find(p => p.type === 'day')?.value || '01';
    const hour = parts.find(p => p.type === 'hour')?.value || '00';
    const minute = parts.find(p => p.type === 'minute')?.value || '00';
    const second = parts.find(p => p.type === 'second')?.value || '00';
    
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
  } catch {
    return new Date();
  }
}

/**
 * Check if it's a specific hour in timezone
 */
export function isHourInTimezone(timezone: string, targetHour: number): boolean {
  try {
    const timeInZone = getCurrentTimeInTimezone(timezone);
    return timeInZone.getHours() === targetHour;
  } catch {
    return false;
  }
}

/**
 * Get common timezones for suggestions
 */
export function getCommonTimezones(): string[] {
  return COMMON_TIMEZONES;
}

/**
 * Format time for display in specific timezone
 */
export function formatTimeInTimezone(date: Date, timezone: string): string {
  try {
    return date.toLocaleString('uk-UA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return date.toLocaleString('uk-UA');
  }
}