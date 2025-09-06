import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    message: 'API TEST WORKING',
    timestamp: new Date().toISOString()
  })
}