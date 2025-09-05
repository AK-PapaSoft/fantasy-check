import { ChatInputCommandInteraction } from 'discord.js';
import { FantasyService } from '../../services/fantasy-service';
import { t } from '../../i18n';
import { getUserLanguage } from '../../bot/utils/user-context';
import pino from 'pino';

const logger = pino({ name: 'discord:today' });

const fantasyService = new FantasyService();

export async function handleToday(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const userId = BigInt(interaction.user.id);
    const userLang = await getUserLanguage(userId);

    logger.info({
      userId: userId.toString(),
    }, 'Discord user requested today digest');

    await interaction.reply({
      content: 'Getting your digest...',
      ephemeral: true,
    });

    const digests = await fantasyService.getWeekDigest(userId);
    
    if (!digests || digests.length === 0) {
      await interaction.editReply({
        content: t('no_games', {}, userLang),
      });
      return;
    }

    // Send each digest as a separate follow-up message
    for (const digest of digests) {
      let message = t('digest_header', {
        league: digest.league,
        week: digest.week.toString(),
      }, userLang) + '\n\n';

      message += t('digest_team', { team: digest.team }, userLang);

      if (digest.opponent) {
        message += '\n' + t('digest_opponent', { opponent: digest.opponent }, userLang);
      }

      if (digest.myScore !== undefined && digest.oppScore !== undefined) {
        message += '\n' + t('digest_score', {
          myScore: digest.myScore.toString(),
          oppScore: digest.oppScore.toString(),
        }, userLang);
      }

      if (digest.topPlayers.length > 0) {
        message += '\n\n' + t('digest_top_players', {
          players: digest.topPlayers.join(', '),
        }, userLang);
      }

      if (digest.upcomingGames.length > 0) {
        message += '\n\n' + t('digest_upcoming', {
          games: digest.upcomingGames.join(', '),
        }, userLang);
      }

      if (digest.reminders.length > 0) {
        message += '\n\n' + t('digest_reminders', {
          reminders: digest.reminders.join(', '),
        }, userLang);
      }

      await interaction.followUp({
        content: message,
        ephemeral: true,
      });
      
      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    logger.info({
      userId: userId.toString(),
      digestsCount: digests.length,
    }, 'Discord digest sent successfully');

  } catch (error) {
    logger.error({
      userId: interaction.user.id,
      error: error instanceof Error ? error.message : error,
    }, 'Error in Discord today handler');

    const userLang = await getUserLanguage(BigInt(interaction.user.id));
    
    if (!interaction.replied) {
      await interaction.reply({
        content: t('error_generic', {}, userLang),
        ephemeral: true,
      });
    } else {
      await interaction.editReply({
        content: t('error_generic', {}, userLang),
      });
    }
  }
}