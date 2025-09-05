import { ChatInputCommandInteraction } from 'discord.js';
import { t, isLanguageSupported, getSupportedLanguages } from '../../i18n';
import { getUserLanguage } from '../../bot/utils/user-context';
import pino from 'pino';

const logger = pino({ name: 'discord:language' });

export async function handleLanguage(interaction: ChatInputCommandInteraction): Promise<void> {
  const userId = BigInt(interaction.user.id);
  const newLang = interaction.options.getString('language');
  
  try {
    const { PrismaClient } = await import('@prisma/client');
    const db = new PrismaClient();
    
    try {
      // Get current user language
      const userLang = await getUserLanguage(userId);
      
      // If no arguments provided, show current language and options
      if (!newLang) {
        const supportedLangs = getSupportedLanguages().join(', ');
        await interaction.reply({
          content: t('language_prompt', {}, userLang),
          ephemeral: true,
        });
        return;
      }

      // Check if language is supported
      if (!isLanguageSupported(newLang)) {
        const supportedLangs = getSupportedLanguages().join(', ');
        await interaction.reply({
          content: t('invalid_language', { languages: supportedLangs }, userLang),
          ephemeral: true,
        });
        return;
      }

      // Update user language in database
      await db.user.upsert({
        where: { tgUserId: userId },
        update: { lang: newLang },
        create: {
          tgUserId: userId,
          tgUsername: interaction.user.username,
          firstName: interaction.user.globalName || interaction.user.username,
          lastName: undefined,
          lang: newLang,
          platform: 'discord',
        },
      });

      // Send confirmation in new language
      const languageNames: Record<string, string> = {
        en: 'English',
        uk: 'Українська',
      };
      
      await interaction.reply({
        content: t('language_changed', { language: languageNames[newLang] || newLang }, newLang),
        ephemeral: true,
      });

      logger.info({
        userId: userId.toString(),
        oldLang: userLang,
        newLang,
      }, 'Discord user changed language');
      
    } finally {
      await db.$disconnect();
    }
  } catch (error) {
    logger.error({
      userId: userId.toString(),
      error: error instanceof Error ? error.message : error,
    }, 'Error handling Discord language command');
    
    await interaction.reply({
      content: t('error_database', {}, 'en'),
      ephemeral: true,
    });
  }
}