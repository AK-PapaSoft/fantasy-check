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

    await ctx.reply(t('linking_user', { username }));

    try {
      const result = await fantasyService.syncUserSleeper(BigInt(userId), username, {
        tgUsername: ctx.from?.username,
        firstName: ctx.from?.first_name,
        lastName: ctx.from?.last_name
      });

      if (result && result.length > 0) {
        const leaguesList = result
          .map((league: any) => `• ${league.leagueName}`)
          .join('\n');

        await ctx.reply(t('leagues_synced', {
          username,
          count: result.length,
          leagues: leaguesList
        }));
      } else {
        await ctx.reply(t('no_leagues_found', { username }));
      }

    } catch (error: any) {
      logger.error({
        userId,
        username,
        error: error instanceof Error ? error.message : error,
      }, 'Error syncing Sleeper account');

      if (error.message?.includes('User not found')) {
        await ctx.reply(t('user_not_found', { username }));
      } else {
        await ctx.reply(t('error_generic'));
      }
    }

  } catch (error) {
    logger.error({
      userId: ctx.from?.id,
      error: error instanceof Error ? error.message : error,
    }, 'Error in link-sleeper handler');

    await ctx.reply(t('error_generic'));
  }
}