import { ChatInputCommandInteraction } from 'discord.js';
import { t } from '../../i18n';
import { getUserLanguage } from '../../bot/utils/user-context';
import pino from 'pino';

const logger = pino({ name: 'discord:help' });

export async function handleHelp(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const userId = BigInt(interaction.user.id);
    const userLang = await getUserLanguage(userId);

    await interaction.reply({
      content: t('help', {}, userLang),
      ephemeral: true,
    });

  } catch (error) {
    logger.error({
      userId: interaction.user.id,
      error: error instanceof Error ? error.message : error,
    }, 'Error in Discord help handler');

    await interaction.reply({
      content: t('error_generic', {}, 'en'),
      ephemeral: true,
    });
  }
}