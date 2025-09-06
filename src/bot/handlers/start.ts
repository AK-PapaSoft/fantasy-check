import { Context } from 'telegraf';
import { t } from '../../i18n';
import pino from 'pino';

const logger = pino({ name: 'bot:start' });

export async function handleStart(ctx: Context): Promise<void> {
  try {
    const userId = ctx.from?.id;
    logger.info({ userId }, 'START HANDLER CALLED');

    await ctx.reply('Hello! This is a test response from start handler.');
    logger.info({ userId }, 'START HANDLER SUCCESS');

  } catch (error) {
    logger.error({ error }, 'START HANDLER ERROR');
    await ctx.reply('Error in start handler');
  }
}