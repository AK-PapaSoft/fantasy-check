import { ChatInputCommandInteraction } from 'discord.js';
import { t } from '../../i18n';
import { getUserLanguage } from '../../bot/utils/user-context';
import { prisma } from '../../db';
import pino from 'pino';

const logger = pino({ name: 'discord:leagues' });

export async function handleLeagues(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const userId = BigInt(interaction.user.id);
    const userLang = await getUserLanguage(userId);

    // Get user's leagues
    const user = await prisma.user.findUnique({
      where: { tgUserId: userId },
      include: {
        leagues: {
          include: {
            league: true,
          },
        },
        alerts: true,
      },
    });

    if (!user || user.leagues.length === 0) {
      await interaction.reply({
        content: t('no_leagues', {}, userLang),
        ephemeral: true,
      });
      return;
    }

    let message = t('your_leagues', {}, userLang) + '\n\n';

    for (const userLeague of user.leagues) {
      const league = userLeague.league;
      const alerts = user.alerts.find(a => a.leagueId === league.id);
      
      message += t('league_info', {
        name: league.name,
        season: league.season.toString(),
        sport: league.sport.toUpperCase(),
        teamId: userLeague.teamId,
      }, userLang);
      
      // Show alerts status
      if (alerts) {
        message += `\nAlerts: ${alerts.pregame ? '🔔' : '🔕'} Pregame | ${alerts.scoring ? '🔔' : '🔕'} Scoring | ${alerts.waivers ? '🔔' : '🔕'} Waivers`;
      }
      
      message += '\n\n';
    }

    await interaction.reply({
      content: message,
      ephemeral: true,
    });

  } catch (error) {
    logger.error({
      userId: interaction.user.id,
      error: error instanceof Error ? error.message : error,
    }, 'Error in Discord leagues handler');

    await interaction.reply({
      content: t('error_generic', {}, 'en'),
      ephemeral: true,
    });
  }
}