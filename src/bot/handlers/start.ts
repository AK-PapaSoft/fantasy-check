import { Context } from 'telegraf';
import { t } from '../../i18n';
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

    await ctx.reply(t('greet'), {
      parse_mode: 'Markdown',
    });

  } catch (error) {
    logger.error({
      userId: ctx.from?.id,
      error: error instanceof Error ? error.message : error,
    }, 'Error in start handler');

    await ctx.reply(t('error_generic'));
  }
}