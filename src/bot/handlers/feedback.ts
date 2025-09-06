import { Context } from 'telegraf';
import { t } from '../../i18n';
import pino from 'pino';

const logger = pino({ name: 'bot:feedback' });

// Anton's Telegram user ID
const ADMIN_TELEGRAM_ID = '430321410';

// Track users in feedback mode
const feedbackModeUsers = new Set<number>();

export async function handleFeedback(ctx: Context): Promise<void> {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      return;
    }

    logger.info({ userId }, 'User initiated feedback');

    // Put user in feedback mode
    feedbackModeUsers.add(userId);

    await ctx.reply(t('feedback_prompt'));

    // Remove user from feedback mode after 5 minutes
    setTimeout(() => {
      feedbackModeUsers.delete(userId);
    }, 5 * 60 * 1000);

  } catch (error) {
    logger.error({
      userId: ctx.from?.id,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Error in feedback handler');

    try {
      await ctx.reply(t('error_generic'));
    } catch (replyError) {
      logger.error('Failed to send error reply in feedback handler', replyError);
    }
  }
}

export async function handleFeedbackMessage(ctx: Context): Promise<void> {
  try {
    const userId = ctx.from?.id;
    if (!userId || !feedbackModeUsers.has(userId)) {
      return;
    }

    const message = ctx.message;
    if (!message || !('text' in message)) {
      return;
    }

    const feedbackText = message.text;
    const username = ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || 'Anonymous';

    // Forward feedback to admin
    const adminMessage = `📩 *Feedback from user:*\n\n` +
                        `👤 User: ${username} (ID: ${userId})\n` +
                        `💬 Message: ${feedbackText}\n\n` +
                        `🕒 Time: ${new Date().toLocaleString('uk-UA')}`;

    try {
      // Try to send to admin
      await ctx.telegram.sendMessage(ADMIN_TELEGRAM_ID, adminMessage, {
        parse_mode: 'Markdown',
      });

      await ctx.reply(t('feedback_sent'));
      logger.info({
        userId,
        username,
        feedbackLength: feedbackText.length,
      }, 'Feedback sent to admin');

    } catch (adminError) {
      logger.error({
        userId,
        error: adminError instanceof Error ? adminError.message : adminError,
        adminId: ADMIN_TELEGRAM_ID,
      }, 'Failed to send feedback to admin');

      // Fallback - just log the feedback and confirm to user
      logger.info({
        userId,
        username,
        feedback: feedbackText,
        adminId: ADMIN_TELEGRAM_ID,
      }, 'FEEDBACK RECEIVED (failed to forward to admin)');

      await ctx.reply('✅ Дякуємо за відгук! Ваше повідомлення збережено в логах (технічні проблеми з пересиланням).');
    }

    // Remove user from feedback mode
    feedbackModeUsers.delete(userId);

  } catch (error) {
    logger.error({
      userId: ctx.from?.id,
      error: error instanceof Error ? error.message : error,
    }, 'Error in feedback message handler');
  }
}

export function isUserInFeedbackMode(userId: number): boolean {
  return feedbackModeUsers.has(userId);
}