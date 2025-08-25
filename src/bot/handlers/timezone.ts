import { Context } from 'telegraf';
import { FantasyService } from '../../services/fantasy-service';
import { isValidTimezone, getCommonTimezones } from '../../utils/timezone';
import { t } from '../../i18n';
import pino from 'pino';

const logger = pino({ name: 'bot:timezone' });

const fantasyService = new FantasyService();

// Store user states for timezone change process
const userStates = new Map<number, { waitingForTimezone: boolean }>();

export async function handleTimezone(ctx: Context): Promise<void> {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      return;
    }

    // Parse command arguments
    const message = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const args = message.split(' ').slice(1); // Remove /timezone
    
    // If timezone provided as argument
    if (args.length > 0 && args[0]) {
      const newTimezone = args[0].trim();
      await processTimezoneChange(ctx, userId, newTimezone);
      return;
    }

    logger.info({ userId }, 'User requested timezone change');

    // Get current user data to show current timezone
    const leagues = await fantasyService.getUserLeagues(BigInt(userId));
    
    // For now, show current timezone as default (would need to get from user profile)
    const currentTz = process.env.TIMEZONE || 'Europe/Brussels';
    
    let message_text = t('current_timezone', { timezone: currentTz }) + '\n\n';
    message_text += t('timezone_prompt') + '\n\n';
    message_text += 'Популярні часові пояси:\n';
    
    const commonTz = getCommonTimezones();
    for (const tz of commonTz.slice(0, 8)) { // Show first 8
      message_text += `• ${tz}\n`;
    }

    await ctx.reply(message_text);

    // Set user state to wait for timezone input
    userStates.set(userId, { waitingForTimezone: true });

    // Clear state after 5 minutes
    setTimeout(() => {
      userStates.delete(userId);
    }, 5 * 60 * 1000);

  } catch (error) {
    logger.error({
      userId: ctx.from?.id,
      error: error instanceof Error ? error.message : error,
    }, 'Error in timezone handler');

    await ctx.reply(t('error_generic'));
  }
}

export async function handleTimezoneInput(ctx: Context): Promise<void> {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      return;
    }

    const userState = userStates.get(userId);
    if (!userState?.waitingForTimezone) {
      return; // User not in timezone change flow
    }

    const message = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    if (!message || message.startsWith('/')) {
      return; // Skip commands
    }

    const timezone = message.trim();
    await processTimezoneChange(ctx, userId, timezone);
    
    // Clear user state
    userStates.delete(userId);

  } catch (error) {
    logger.error({
      userId: ctx.from?.id,
      error: error instanceof Error ? error.message : error,
    }, 'Error in timezone input handler');

    await ctx.reply(t('error_generic'));
    
    // Clear user state on error
    if (ctx.from?.id) {
      userStates.delete(ctx.from.id);
    }
  }
}

async function processTimezoneChange(ctx: Context, userId: number, timezone: string): Promise<void> {
  if (!isValidTimezone(timezone)) {
    await ctx.reply(t('invalid_timezone'));
    return;
  }

  try {
    await fantasyService.updateUserTimezone(BigInt(userId), timezone);
    
    await ctx.reply(t('timezone_changed', { timezone }));

    logger.info({
      userId,
      timezone,
    }, 'User timezone updated successfully');

  } catch (error) {
    logger.error({
      userId,
      timezone,
      error: error instanceof Error ? error.message : error,
    }, 'Failed to update user timezone');

    await ctx.reply(t('error_database'));
  }
}