import { Context } from 'telegraf';
import pino from 'pino';

const logger = pino({ name: 'bot:get-my-id' });

export async function handleGetMyId(ctx: Context): Promise<void> {
  try {
    const userId = ctx.from?.id;
    const username = ctx.from?.username;
    const firstName = ctx.from?.first_name;
    const lastName = ctx.from?.last_name;

    logger.info({
      userId,
      username,
      firstName,
      lastName,
    }, 'User requested their ID');

    if (!userId) {
      await ctx.reply('Не вдалося отримати ваш ID.');
      return;
    }

    const message = `🆔 Ваші дані:\n\n` +
                   `👤 User ID: ${userId}\n` +
                   `📝 Username: ${username ? `@${username}` : 'Немає'}\n` +
                   `🏷️ Ім'я: ${firstName || 'Немає'}` +
                   (lastName ? `\n🏷️ Прізвище: ${lastName}` : '');

    await ctx.reply(message);

  } catch (error) {
    logger.error({
      userId: ctx.from?.id,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Error in get-my-id handler');

    try {
      await ctx.reply('Помилка при отриманні ID.');
    } catch (replyError) {
      logger.error('Failed to send error reply', replyError);
    }
  }
}