import { Language } from '../../i18n';

/**
 * Get user's preferred language from database
 */
export async function getUserLanguage(userId: bigint): Promise<Language> {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      const user = await prisma.user.findUnique({
        where: { tgUserId: userId },
        select: { lang: true, platform: true },
      });
      
      if (user?.lang) {
        return user.lang as Language;
      }
      
      // Fallback based on platform if available, otherwise detect from user ID
      const platform = (user?.platform as 'telegram' | 'discord') || getUserPlatform(userId);
      return getDefaultLanguageForPlatform(platform);
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    // Default based on user ID pattern if database error
    const platform = getUserPlatform(userId);
    return getDefaultLanguageForPlatform(platform);
  }
}

/**
 * Get user's platform (telegram or discord) based on ID format
 * Telegram user IDs are typically smaller numbers
 * Discord user IDs are typically 17-19 digit snowflakes
 */
export function getUserPlatform(userId: bigint): 'telegram' | 'discord' {
  // Simple heuristic: Discord IDs are much larger (17-19 digits)
  // Telegram IDs are typically much smaller
  const idString = userId.toString();
  
  if (idString.length >= 17) {
    return 'discord';
  }
  return 'telegram';
}

/**
 * Get default language for platform
 */
export function getDefaultLanguageForPlatform(platform: 'telegram' | 'discord'): Language {
  return platform === 'discord' ? 'en' : 'uk';
}