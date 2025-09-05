import { TelegramBot } from '../../bot';
import { DiscordBot } from '../../discord-bot';
import { getUserLanguage } from '../../bot/utils/user-context';
import { t, TranslationKey } from '../../i18n';
import pino from 'pino';

const logger = pino({ name: 'multi-platform-messenger' });

export class MultiPlatformMessenger {
  constructor(
    private telegramBot: TelegramBot,
    private discordBot?: DiscordBot
  ) {}

  /**
   * Send message to user on their platform
   */
  async sendMessage(
    userId: bigint,
    messageKey: TranslationKey,
    variables: Record<string, string | number> = {},
    options?: any
  ): Promise<void> {
    try {
      const userLang = await getUserLanguage(userId);
      const message = t(messageKey, variables, userLang);
      
      // Determine platform by user ID format
      const platform = this.getPlatformFromUserId(userId);
      
      if (platform === 'telegram') {
        await this.telegramBot.sendMessage(Number(userId), message, options);
      } else if (platform === 'discord' && this.discordBot) {
        await this.discordBot.sendMessage(userId.toString(), message, options);
      } else {
        logger.warn({
          userId: userId.toString(),
          platform,
          discordBotAvailable: !!this.discordBot,
        }, 'Cannot send message - platform not supported or bot not available');
      }
    } catch (error) {
      logger.error({
        userId: userId.toString(),
        messageKey,
        error: error instanceof Error ? error.message : error,
      }, 'Failed to send message');
      throw error;
    }
  }

  /**
   * Send raw message to user
   */
  async sendRawMessage(
    userId: bigint,
    message: string,
    options?: any
  ): Promise<void> {
    try {
      const platform = this.getPlatformFromUserId(userId);
      
      if (platform === 'telegram') {
        await this.telegramBot.sendMessage(Number(userId), message, options);
      } else if (platform === 'discord' && this.discordBot) {
        await this.discordBot.sendMessage(userId.toString(), message, options);
      } else {
        logger.warn({
          userId: userId.toString(),
          platform,
          discordBotAvailable: !!this.discordBot,
        }, 'Cannot send raw message - platform not supported or bot not available');
      }
    } catch (error) {
      logger.error({
        userId: userId.toString(),
        message: message.substring(0, 100),
        error: error instanceof Error ? error.message : error,
      }, 'Failed to send raw message');
      throw error;
    }
  }

  /**
   * Determine platform from user ID
   */
  private getPlatformFromUserId(userId: bigint): 'telegram' | 'discord' {
    // Discord IDs are typically 17-19 digits (snowflakes)
    // Telegram IDs are typically much smaller
    const idString = userId.toString();
    
    if (idString.length >= 17) {
      return 'discord';
    }
    return 'telegram';
  }
}