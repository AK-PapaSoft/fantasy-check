import { Context } from 'telegraf';
import { t } from '../../i18n';
import pino from 'pino';

const logger = pino({ name: 'bot:help' });

export async function handleHelp(ctx: Context): Promise<void> {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      return;
    }

    logger.info({ userId }, 'User requested help');

    await ctx.reply('🔥 DEBUGGING VERSION - Help command working! Deployment timestamp: ' + new Date().toISOString());

  } catch (error) {
    logger.error({
      userId: ctx.from?.id,
      error: error instanceof Error ? error.message : error,
    }, 'Error in help handler');

    await ctx.reply(t('error_generic'));
  }
}