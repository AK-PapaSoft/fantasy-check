import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Database operations
export async function createOrUpdateUser(userData: {
  tgUserId: number
  tgUsername?: string
  firstName?: string
  lastName?: string
  lang?: string
  tz?: string
  platform?: string
}) {
  const { data, error } = await supabase
    .from('users')
    .upsert({
      tgUserId: userData.tgUserId,
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

  if (error) {
    console.error('Supabase error:', error)
    throw error
  }

  return data?.[0]
}

export async function getUser(tgUserId: number) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('tgUserId', tgUserId)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.error('Supabase error:', error)
    throw error
  }

  return data
}

export async function updateUserTimezone(tgUserId: number, timezone: string) {
  const { error } = await supabase
    .from('users')
    .update({ 
      tz: timezone,
      updatedAt: new Date().toISOString()
    })
    .eq('tgUserId', tgUserId)

  if (error) {
    console.error('Supabase error:', error)
    throw error
  }
}