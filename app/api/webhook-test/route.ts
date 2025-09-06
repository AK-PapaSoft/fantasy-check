import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '../../../src/services/supabase-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Simulate a simple /start command
    const mockUserId = 12345
    const result = {
      timestamp: new Date().toISOString(),
      userId: mockUserId,
      tests: {}
    }

    // Test 1: Environment variables
    result.tests.env = {
      SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    }

    // Test 2: Supabase upsert
    try {
      await supabaseService.upsertUser({
        tgUserId: BigInt(mockUserId),
        tgUsername: 'testuser',
        firstName: 'Test',
        lang: 'uk'
      })
      result.tests.supabaseUpsert = { success: true }
    } catch (error) {
      result.tests.supabaseUpsert = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 3: Supabase get user  
    try {
      const user = await supabaseService.getUserByTgId(BigInt(mockUserId))
      result.tests.supabaseGet = { success: true, found: !!user }
    } catch (error) {
      result.tests.supabaseGet = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}