import { Context } from 'telegraf';
import { t } from '../../i18n';
import { prisma } from '../../db';
import { getUserLanguage } from '../utils/user-context';
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

    // Check if this is a new user and create/update with Telegram info
    const existingUser = await prisma.user.findUnique({
      where: { tgUserId: BigInt(userId) },
    });

    const isNewUser = !existingUser;

    // Update or create user with full Telegram info
    await prisma.user.upsert({
      where: { tgUserId: BigInt(userId) },
      update: {
        tgUsername: ctx.from?.username,
        firstName: ctx.from?.first_name,
        lastName: ctx.from?.last_name,
        updatedAt: new Date(),
      },
      create: {
        tgUserId: BigInt(userId),
        tgUsername: ctx.from?.username,
        firstName: ctx.from?.first_name,
        lastName: ctx.from?.last_name,
        lang: 'uk', // Ukrainian default for Telegram
        tz: 'Europe/Kiev', // Kiev timezone as default
        platform: 'telegram',
      },
    });

    // Get user language and send appropriate greeting
    const userLang = await getUserLanguage(BigInt(userId));
    const greeting = isNewUser ? t('greet_sporthub', {}, userLang) : t('greet', {}, userLang);
    await ctx.reply(greeting);

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