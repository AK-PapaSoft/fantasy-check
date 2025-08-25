import { Context } from 'telegraf';
import { InlineKeyboardMarkup } from 'telegraf/typings/core/types/typegram';
import { FantasyService } from '../../services/fantasy-service';
import { t } from '../../i18n';
import pino from 'pino';

const logger = pino({ name: 'bot:leagues' });

const fantasyService = new FantasyService();

export async function handleLeagues(ctx: Context): Promise<void> {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      return;
    }

    logger.info({ userId }, 'User requested leagues');

    const leagues = await fantasyService.getUserLeagues(BigInt(userId));

    if (leagues.length === 0) {
      await ctx.reply(t('no_leagues'));
      return;
    }

    let message = t('your_leagues') + '\n\n';

    const keyboard: InlineKeyboardMarkup = {
      inline_keyboard: [],
    };

    for (const league of leagues) {
      const leagueInfo = t('league_info', {
        name: league.name,
        season: league.season.toString(),
        sport: league.sport.toUpperCase(),
        teamId: league.teamId,
      });

      message += leagueInfo + '\n\n';

      // Add inline buttons for each league
      const leagueButtons = [
        {
          text: t('league_details'),
          callback_data: `league_details_${league.leagueId}`,
        },
      ];

      // Alert toggle button
      const allAlertsEnabled = league.alertsEnabled.pregame && 
                              league.alertsEnabled.scoring && 
                              league.alertsEnabled.waivers;
      
      if (allAlertsEnabled) {
        leagueButtons.push({
          text: t('disable_alerts'),
          callback_data: `disable_alerts_${league.leagueId}`,
        });
      } else {
        leagueButtons.push({
          text: t('enable_alerts'),
          callback_data: `enable_alerts_${league.leagueId}`,
        });
      }

      leagueButtons.push({
        text: t('remove_league'),
        callback_data: `remove_league_${league.leagueId}`,
      });

      keyboard.inline_keyboard.push(leagueButtons);
    }

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });

  } catch (error) {
    logger.error({
      userId: ctx.from?.id,
      error: error instanceof Error ? error.message : error,
    }, 'Error in leagues handler');

    await ctx.reply(t('error_generic'));
  }
}

export async function handleLeagueCallback(ctx: Context): Promise<void> {
  try {
    const userId = ctx.from?.id;
    if (!userId || !ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
      return;
    }

    const callbackData = ctx.callbackQuery.data;
    const [action, leagueIdStr] = callbackData.split('_').slice(-2);
    const leagueId = parseInt(leagueIdStr);

    if (isNaN(leagueId)) {
      await ctx.answerCbQuery('Невірний ID ліги');
      return;
    }

    logger.info({
      userId,
      action: callbackData,
      leagueId,
    }, 'User triggered league action');

    switch (true) {
      case callbackData.startsWith('enable_alerts_'):
        await fantasyService.updateAlertPreferences(BigInt(userId), leagueId, {
          pregame: true,
          scoring: true,
          waivers: true,
        });
        
        const leagueInfo = await fantasyService.getUserLeagues(BigInt(userId));
        const league = leagueInfo.find(l => l.leagueId === leagueId);
        
        await ctx.answerCbQuery(t('alerts_enabled', { league: league?.name || 'League' }));
        
        // Refresh the leagues display
        await handleLeagues(ctx);
        break;

      case callbackData.startsWith('disable_alerts_'):
        await fantasyService.updateAlertPreferences(BigInt(userId), leagueId, {
          pregame: false,
          scoring: false,
          waivers: false,
        });
        
        const leagueInfo2 = await fantasyService.getUserLeagues(BigInt(userId));
        const league2 = leagueInfo2.find(l => l.leagueId === leagueId);
        
        await ctx.answerCbQuery(t('alerts_disabled', { league: league2?.name || 'League' }));
        
        // Refresh the leagues display
        await handleLeagues(ctx);
        break;

      case callbackData.startsWith('remove_league_'):
        await fantasyService.removeUserLeague(BigInt(userId), leagueId);
        
        const leagueInfo3 = await fantasyService.getUserLeagues(BigInt(userId));
        const removedLeague = leagueInfo3.find(l => l.leagueId === leagueId);
        
        await ctx.answerCbQuery(t('league_removed', { league: removedLeague?.name || 'League' }));
        
        // Refresh the leagues display
        await handleLeagues(ctx);
        break;

      case callbackData.startsWith('league_details_'):
        // For now, just show basic info
        const leagues = await fantasyService.getUserLeagues(BigInt(userId));
        const detailLeague = leagues.find(l => l.leagueId === leagueId);
        
        if (detailLeague) {
          const alertStatus = `Алерти: ${detailLeague.alertsEnabled.pregame ? '🔔' : '🔕'} Pregame | ${detailLeague.alertsEnabled.scoring ? '🔔' : '🔕'} Scoring | ${detailLeague.alertsEnabled.waivers ? '🔔' : '🔕'} Waivers`;
          
          await ctx.answerCbQuery(
            `${detailLeague.name}\nКоманда: ${detailLeague.teamId}\n${alertStatus}`,
            { show_alert: true }
          );
        }
        break;

      default:
        await ctx.answerCbQuery('Невідома дія');
    }

  } catch (error) {
    logger.error({
      userId: ctx.from?.id,
      callbackData: ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : '',
      error: error instanceof Error ? error.message : error,
    }, 'Error in league callback handler');

    await ctx.answerCbQuery(t('error_generic'));
  }
}