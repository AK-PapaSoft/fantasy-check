import { ChatInputCommandInteraction } from 'discord.js';
import { t } from '../../i18n';
import { prisma } from '../../db';
import { getUserLanguage } from '../../bot/utils/user-context';
import pino from 'pino';

const logger = pino({ name: 'discord:start' });

export async function handleStart(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const userId = interaction.user.id;

    logger.info({
      userId,
      username: interaction.user.username,
      globalName: interaction.user.globalName,
    }, 'Discord user started bot');

    // Check if this is a new user and create/update with Discord info
    const existingUser = await prisma.user.findUnique({
      where: { tgUserId: BigInt(userId) },
    });

    const isNewUser = !existingUser;

    // Update or create user with full Discord info
    await prisma.user.upsert({
      where: { tgUserId: BigInt(userId) },
      update: {
        tgUsername: interaction.user.username,
        firstName: interaction.user.globalName || interaction.user.username,
        lastName: undefined, // Discord doesn't have separate last name
        updatedAt: new Date(),
      },
      create: {
        tgUserId: BigInt(userId),
        tgUsername: interaction.user.username,
        firstName: interaction.user.globalName || interaction.user.username,
        lastName: undefined,
        lang: 'en', // English default for Discord
        tz: 'Europe/Kiev', // Kiev timezone as default
        platform: 'discord',
      },
    });

    // Get user language and send appropriate greeting
    const userLang = await getUserLanguage(BigInt(userId));
    const greeting = isNewUser ? t('greet_sporthub', {}, userLang) : t('greet', {}, userLang);
    
    await interaction.reply({
      content: greeting,
      ephemeral: true, // Only visible to the user
    });

  } catch (error) {
    logger.error({
      userId: interaction.user.id,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Error in Discord start handler');

    try {
      await interaction.reply({
        content: t('error_generic', {}, 'en'),
        ephemeral: true,
      });
    } catch (replyError) {
      logger.error('Failed to send error reply in Discord start handler', replyError);
    }
  }
}