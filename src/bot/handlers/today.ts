import { Context } from 'telegraf';
import { FantasyService } from '../../services/fantasy-service';
import { t } from '../../i18n';
import pino from 'pino';

const logger = pino({ name: 'bot:today' });

const fantasyService = new FantasyService();

export async function handleToday(ctx: Context): Promise<void> {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      return;
    }

    logger.info({ userId }, 'User requested today digest');

    // Get digest for current week
    const digests = await fantasyService.getWeekDigest(BigInt(userId));

    if (digests.length === 0) {
      await ctx.reply(t('no_games'));
      return;
    }

    // Send separate message for each team/league
    for (const digest of digests) {
      let message = t('digest_header', {
        league: digest.league,
        week: digest.week.toString(),
      }) + '\n\n';

      message += t('digest_team', { team: digest.team });

      if (digest.opponent) {
        message += '\n' + t('digest_opponent', { opponent: digest.opponent });
      }

      if (digest.myScore !== undefined && digest.oppScore !== undefined) {
        message += '\n' + t('digest_score', {
          myScore: digest.myScore.toString(),
          oppScore: digest.oppScore.toString(),
        });
      }

      if (digest.topPlayers.length > 0) {
        message += '\n\n' + t('digest_top_players', {
          players: digest.topPlayers.join(', '),
        });
      }

      if (digest.upcomingGames.length > 0) {
        message += '\n\n' + t('digest_upcoming', {
          games: digest.upcomingGames.join(', '),
        });
      }

      if (digest.reminders.length > 0) {
        message += '\n\n' + t('digest_reminders', {
          reminders: digest.reminders.join(', '),
        });
      }

      await ctx.reply(message, {
        parse_mode: 'Markdown',
      });

      // Small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.info({
      userId,
      digestsCount: digests.length,
    }, 'Today digest sent successfully');

  } catch (error) {
    logger.error({
      userId: ctx.from?.id,
      error: error instanceof Error ? error.message : error,
    }, 'Error in today handler');

    await ctx.reply(t('error_generic'));
  }
}