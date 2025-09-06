import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    status: 'WORKING',
    timestamp: new Date().toISOString(),
    domain: 'fantasy-check.vercel.app',
    message: 'Deployment test successful!'
  })
}
