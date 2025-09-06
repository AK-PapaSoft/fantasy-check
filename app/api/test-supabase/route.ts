import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    environment: {
      SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      actualUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    }
  }

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Test connection
    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    if (error) {
      results.error = error.message
      results.details = error.details
      results.code = error.code
    } else {
      results.success = true
      results.userCount = count
      results.message = 'Supabase connection successful'
    }
  } catch (error) {
    results.error = error instanceof Error ? error.message : 'Unknown error'
    results.stack = error instanceof Error ? error.stack : undefined
  }

  return NextResponse.json(results)
}