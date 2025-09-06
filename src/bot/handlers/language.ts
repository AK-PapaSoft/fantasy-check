import { Context } from 'telegraf';
import { connectDatabase } from '../../db';
import { t, isLanguageSupported, getSupportedLanguages } from '../../i18n';
import { getUserLanguage } from '../utils/user-context';
import pino from 'pino';

const logger = pino({ name: 'handlers:language' });

export async function handleLanguage(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  const userId = BigInt(ctx.from?.id || 0);
  const args = ctx.text?.split(' ').slice(1) || [];
  
  if (!ctx.from?.id || !chatId) {
    await ctx.reply(t('error_generic'));
    return;
  }

  try {
    const { PrismaClient } = await import('@prisma/client');
    const db = new PrismaClient();
    
    try {
      // Get current user language
      const userLang = await getUserLanguage(userId);
      
      // If no arguments provided, show current language and options
      if (args.length === 0) {
        const supportedLangs = getSupportedLanguages().join(', ');
        await ctx.reply(
          t('language_prompt', {}, userLang),
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const newLang = args[0];
      
      // Check if language is supported
      if (!isLanguageSupported(newLang)) {
        const supportedLangs = getSupportedLanguages().join(', ');
        await ctx.reply(
          t('invalid_language', { languages: supportedLangs }, userLang)
        );
        return;
      }

      // Update user language in database
      await db.user.upsert({
        where: { tgUserId: userId },
        update: { lang: newLang },
        create: {
          tgUserId: userId,
          tgUsername: ctx.from.username,
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name,
          lang: newLang,
          platform: 'telegram',
        },
      });

      // Send confirmation in new language
      const languageNames: Record<string, string> = {
        en: 'English',
        uk: 'Українська',
      };
      
      await ctx.reply(
        t('language_changed', { language: languageNames[newLang] || newLang }, newLang)
      );

      logger.info({
        userId: userId.toString(),
        oldLang: userLang,
        newLang,
      }, 'User changed language');
      
    } finally {
      await db.$disconnect();
    }
  } catch (error) {
    logger.error({
      userId: userId.toString(),
      error: error instanceof Error ? error.message : error,
    }, 'Error handling language command');
    
    await ctx.reply(t('error_database'));
  }
}