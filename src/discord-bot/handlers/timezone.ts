import { ChatInputCommandInteraction } from 'discord.js';
import { t } from '../../i18n';
import { getUserLanguage } from '../../bot/utils/user-context';
import { isValidTimezone, getCommonTimezones } from '../../utils/timezone';
import { prisma } from '../../db';
import pino from 'pino';

const logger = pino({ name: 'discord:timezone' });

export async function handleTimezone(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const userId = BigInt(interaction.user.id);
    const timezone = interaction.options.getString('timezone');
    const userLang = await getUserLanguage(userId);

    // Get current user timezone
    const user = await prisma.user.findUnique({
      where: { tgUserId: userId },
      select: { tz: true },
    });

    if (!timezone) {
      // Show current timezone and common options
      const currentTz = user?.tz || 'Europe/Kiev';
      const commonTzs = getCommonTimezones();
      
      const message = `${t('current_timezone', { timezone: currentTz }, userLang)}\n\n` +
                     `Common timezones:\n${commonTzs.map(tz => `• ${tz}`).join('\n')}\n\n` +
                     `Use: \`/timezone timezone:Europe/Kiev\``;

      await interaction.reply({
        content: message,
        ephemeral: true,
      });
      return;
    }

    // Validate timezone
    if (!isValidTimezone(timezone)) {
      await interaction.reply({
        content: t('invalid_timezone', {}, userLang),
        ephemeral: true,
      });
      return;
    }

    // Update user timezone
    await prisma.user.upsert({
      where: { tgUserId: userId },
      update: { tz: timezone },
      create: {
        tgUserId: userId,
        tgUsername: interaction.user.username,
        firstName: interaction.user.globalName || interaction.user.username,
        lastName: undefined,
        lang: 'en',
        tz: timezone,
        platform: 'discord',
      },
    });

    await interaction.reply({
      content: t('timezone_changed', { timezone }, userLang),
      ephemeral: true,
    });

    logger.info({
      userId: userId.toString(),
      timezone,
    }, 'Discord user changed timezone');

  } catch (error) {
    logger.error({
      userId: interaction.user.id,
      error: error instanceof Error ? error.message : error,
    }, 'Error in Discord timezone handler');

    await interaction.reply({
      content: t('error_generic', {}, 'en'),
      ephemeral: true,
    });
  }
}