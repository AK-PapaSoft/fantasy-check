import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    deployed: true, 
    timestamp: new Date().toISOString(),
    version: 'pick-em-support-v1',
    message: 'Pick-em league support is deployed!'
  })
}