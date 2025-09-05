import { ChatInputCommandInteraction } from 'discord.js';
import { t } from '../../i18n';
import { getUserLanguage } from '../../bot/utils/user-context';
import pino from 'pino';

const logger = pino({ name: 'discord:feedback' });

export async function handleFeedback(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const userId = BigInt(interaction.user.id);
    const message = interaction.options.getString('message', true);
    const userLang = await getUserLanguage(userId);

    // Log feedback message
    logger.info({
      userId: userId.toString(),
      platform: 'discord',
      username: interaction.user.username,
      message: message.substring(0, 500), // Log first 500 chars
    }, 'User feedback received');

    // TODO: Send to developers via webhook, email, or other notification system
    
    await interaction.reply({
      content: t('feedback_sent', {}, userLang),
      ephemeral: true,
    });

  } catch (error) {
    logger.error({
      userId: interaction.user.id,
      error: error instanceof Error ? error.message : error,
    }, 'Error in Discord feedback handler');

    const userLang = await getUserLanguage(BigInt(interaction.user.id));
    await interaction.reply({
      content: t('feedback_error', {}, userLang),
      ephemeral: true,
    });
  }
}