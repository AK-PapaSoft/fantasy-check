import { Context } from 'telegraf';
import { t } from '../../i18n';
import pino from 'pino';

const logger = pino({ name: 'bot:start' });

export async function handleStart(ctx: Context): Promise<void> {
  await ctx.reply('🚀 START WORKS! New version: ' + Date.now());
}