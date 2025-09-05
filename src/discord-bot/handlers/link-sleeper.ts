import { ChatInputCommandInteraction } from 'discord.js';
import { FantasyService } from '../../services/fantasy-service';
import { t } from '../../i18n';
import { getUserLanguage } from '../../bot/utils/user-context';
import pino from 'pino';

const logger = pino({ name: 'discord:link-sleeper' });

const fantasyService = new FantasyService();

export async function handleLinkSleeper(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const userId = interaction.user.id;
    const username = interaction.options.getString('username', true);

    // Validate username format
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      const userLang = await getUserLanguage(BigInt(userId));
      await interaction.reply({
        content: t('error_invalid_username', {}, userLang),
        ephemeral: true,
      });
      return;
    }

    logger.info({
      userId,
      username,
    }, 'Discord user linking Sleeper account');

    const userLang = await getUserLanguage(BigInt(userId));
    await interaction.reply({
      content: t('linking_user', { username }, userLang),
      ephemeral: true,
    });

    try {
      const result = await fantasyService.syncUserSleeper(BigInt(userId), username, {
        tgUsername: interaction.user.username,
        firstName: interaction.user.globalName || interaction.user.username,
        lastName: undefined,
        platform: 'discord',
      });

      if (result && result.length > 0) {
        const leaguesList = result
          .map((league: any) => `• ${league.leagueName}`)
          .join('\n');

        await interaction.followUp({
          content: `${t('linked_ok', { username }, userLang)}\n\n${t('leagues_synced', { count: result.length }, userLang)}\n\n${leaguesList}`,
          ephemeral: true,
        });

        logger.info({
          userId,
          username,
          leaguesCount: result.length,
        }, 'Discord user successfully linked Sleeper account');
      } else {
        await interaction.followUp({
          content: t('no_leagues_found', { username, season: new Date().getFullYear().toString() }, userLang),
          ephemeral: true,
        });
      }
    } catch (syncError: any) {
      logger.error({
        userId,
        username,
        error: syncError.message || syncError,
      }, 'Error syncing Discord user Sleeper account');

      if (syncError.message && syncError.message.includes('not found')) {
        await interaction.followUp({
          content: t('user_not_found', { username }, userLang),
          ephemeral: true,
        });
      } else {
        await interaction.followUp({
          content: t('error_sleeper_api', {}, userLang),
          ephemeral: true,
        });
      }
    }

  } catch (error) {
    logger.error({
      userId: interaction.user.id,
      error: error instanceof Error ? error.message : error,
    }, 'Error in Discord link sleeper handler');

    const userLang = await getUserLanguage(BigInt(interaction.user.id));
    
    if (!interaction.replied) {
      await interaction.reply({
        content: t('error_generic', {}, userLang),
        ephemeral: true,
      });
    } else {
      await interaction.followUp({
        content: t('error_generic', {}, userLang),
        ephemeral: true,
      });
    }
  }
}