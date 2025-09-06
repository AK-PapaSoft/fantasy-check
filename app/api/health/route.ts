import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    status: 'WORKING',
    timestamp: new Date().toISOString(),
    domain: 'fantasy-check.vercel.app',
    framework: 'Next.js (Framework Preset Applied)',
    message: 'Deployment with correct framework settings!'
  })
}
