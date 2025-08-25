import { Context } from 'telegraf';
import { FantasyService } from '../../services/fantasy-service';
import { t } from '../../i18n';
import pino from 'pino';

const logger = pino({ name: 'bot:link-sleeper' });

const fantasyService = new FantasyService();

export async function handleLinkSleeper(ctx: Context): Promise<void> {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      return;
    }

    // Parse command arguments
    const message = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const args = message.split(' ').slice(1); // Remove /link_sleeper
    
    if (args.length === 0 || !args[0]) {
      await ctx.reply(t('error_command_format', { format: '/link_sleeper <нікнейм>' }));
      return;
    }

    const username = args[0].trim();

    // Validate username format
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      await ctx.reply(t('error_invalid_username'));
      return;
    }

    logger.info({
      userId,
      username,
    }, 'User linking Sleeper account');

    // Send loading message
    const loadingMessage = await ctx.reply(t('linking_user', { username }));

    try {
      // Sync user data
      await fantasyService.syncUserSleeper(BigInt(userId), username);

      // Get synced leagues count
      const leagues = await fantasyService.getUserLeagues(BigInt(userId));

      // Update message with success
      await ctx.telegram.editMessageText(
        ctx.chat!.id,
        loadingMessage.message_id,
        undefined,
        t('linked_ok', { username }) + '\n' + t('leagues_synced', { count: leagues.length }),
        { parse_mode: 'Markdown' }
      );

      logger.info({
        userId,
        username,
        leaguesCount: leagues.length,
      }, 'Successfully linked Sleeper account');

    } catch (syncError) {
      const errorMessage = syncError instanceof Error ? syncError.message : t('error_sleeper_api');
      
      await ctx.telegram.editMessageText(
        ctx.chat!.id,
        loadingMessage.message_id,
        undefined,
        errorMessage
      );

      logger.error({
        userId,
        username,
        error: errorMessage,
      }, 'Failed to link Sleeper account');
    }

  } catch (error) {
    logger.error({
      userId: ctx.from?.id,
      error: error instanceof Error ? error.message : error,
    }, 'Error in link-sleeper handler');

    await ctx.reply(t('error_generic'));
  }
}