import { Context } from 'telegraf';
import { t } from '../../i18n';
import { prisma } from '../../db';
import { getUserLanguage } from '../utils/user-context';
import { supabaseService } from '../../services/supabase-service';
import pino from 'pino';

const logger = pino({ name: 'bot:start' });

export async function handleStart(ctx: Context): Promise<void> {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      return;
    }

    logger.info({
      userId,
      username: ctx.from?.username,
      firstName: ctx.from?.first_name,
    }, 'User started bot');

    // For now, skip database operations and just send greeting
    // This will help us isolate if the issue is in DB or elsewhere
    try {
      const greeting = t('greet_sporthub');
      await ctx.reply(greeting);
      logger.info({ userId }, 'Greeting sent successfully');
    } catch (greetingError) {
      logger.error({ userId, error: greetingError }, 'Failed to send greeting');
      throw greetingError;
    }

  } catch (error) {
    logger.error({
      userId: ctx.from?.id,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Error in start handler');

    try {
      await ctx.reply(t('error_generic'));
    } catch (replyError) {
      logger.error('Failed to send error reply in start handler', replyError);
    }
  }
}