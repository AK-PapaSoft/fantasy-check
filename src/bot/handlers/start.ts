import { Context } from 'telegraf';
import { t } from '../../i18n';
import { createOrUpdateUser } from '../../lib/supabase';

export async function handleStart(ctx: Context): Promise<void> {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    console.log('START: User ID:', userId);

    // Try to create/update user with Supabase
    try {
      await createOrUpdateUser({
        tgUserId: userId,
        tgUsername: ctx.from?.username,
        firstName: ctx.from?.first_name,
        lastName: ctx.from?.last_name,
        lang: 'uk',
        platform: 'telegram'
      });
      
      console.log('START: User saved to Supabase');
      await ctx.reply(t('greet_sporthub'));
    } catch (dbError) {
      console.error('START: Database error:', dbError);
      // Send greeting anyway
      await ctx.reply(t('greet_sporthub'));
    }

  } catch (error) {
    console.error('START: Error:', error);
    await ctx.reply(t('error_generic'));
  }
}