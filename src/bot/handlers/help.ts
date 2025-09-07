import { Context } from 'telegraf';
import { t } from '../../i18n';
import pino from 'pino';

const logger = pino({ name: 'bot:help' });

export async function handleHelp(ctx: Context): Promise<void> {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      return;
    }

    logger.info({ userId }, 'User requested help');

    const helpMessage = `🔧 **Fantasy Check - Довідка**

🏈 **Основні команди:**
• /start - Почати роботу з ботом
• /help - Показати цю довідку
• /link_sleeper <нік> - Підключити Sleeper профіль

🏆 **Управління лігами:**
• /leagues - Переглянути мої ліги
• /today - Дайджест на сьогодні

⚙️ **Налаштування:**
• /timezone - Змінити часовий пояс
• /lang - Змінити мову
• /feedback - Надіслати відгук

📱 **Бот працює на:** https://fantasy-check.vercel.app/

💬 **Підтримка:** @anton_kravchuk23`;

    await ctx.reply(helpMessage, { parse_mode: 'Markdown' });

  } catch (error) {
    logger.error({
      userId: ctx.from?.id,
      error: error instanceof Error ? error.message : error,
    }, 'Error in help handler');

    await ctx.reply(t('error_generic'));
  }
}