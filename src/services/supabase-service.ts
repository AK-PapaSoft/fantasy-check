import { createClient } from '@supabase/supabase-js'
import pino from 'pino'

const logger = pino({ name: 'supabase-service' })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export class SupabaseService {
  /**
   * Create or update user
   */
  async upsertUser(userData: {
    tgUserId: bigint
    tgUsername?: string
    firstName?: string
    lastName?: string
    lang?: string
    tz?: string
    platform?: string
  }) {
    try {
      const tgUserIdNum = Number(userData.tgUserId) // Convert bigint to number
      
      const { data, error } = await supabase
        .from('users')
        .upsert({
          tgUserId: tgUserIdNum, // Use number instead of string
          tgUsername: userData.tgUsername,
          firstName: userData.firstName,
          lastName: userData.lastName,
          lang: userData.lang || 'uk',
          tz: userData.tz || 'Europe/Kiev',
          platform: userData.platform || 'telegram',
          updatedAt: new Date().toISOString()
        }, {
          onConflict: 'tgUserId'
        })
        .select()

      if (error) throw error
      
      logger.info({ tgUserId: userData.tgUserId.toString() }, 'User upserted via Supabase')
      return data[0]
    } catch (error) {
      logger.error({ error, tgUserId: userData.tgUserId.toString() }, 'Failed to upsert user via Supabase')
      throw error
    }
  }

  /**
   * Get user by Telegram ID
   */
  async getUserByTgId(tgUserId: bigint) {
    try {
      const tgUserIdNum = Number(tgUserId) // Convert bigint to number
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('tgUserId', tgUserIdNum)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      return data
    } catch (error) {
      logger.error({ error, tgUserId: tgUserId.toString() }, 'Failed to get user via Supabase')
      throw error
    }
  }

  /**
   * Update user timezone
   */
  async updateUserTimezone(tgUserId: bigint, timezone: string) {
    try {
      const tgUserIdNum = Number(tgUserId) // Convert bigint to number
      
      const { error } = await supabase
        .from('users')
        .update({ 
          tz: timezone,
          updatedAt: new Date().toISOString()
        })
        .eq('tgUserId', tgUserIdNum)

      if (error) throw error
      
      logger.info({ tgUserId: tgUserId.toString(), timezone }, 'User timezone updated via Supabase')
    } catch (error) {
      logger.error({ error, tgUserId: tgUserId.toString(), timezone }, 'Failed to update timezone via Supabase')
      throw error
    }
  }
}

export const supabaseService = new SupabaseService()