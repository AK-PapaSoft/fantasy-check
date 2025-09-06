import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    message: 'Fantasy Gather Bot is running on Vercel',
    environment: process.env.NODE_ENV
  })
}