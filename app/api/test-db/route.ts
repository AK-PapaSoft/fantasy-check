import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Import prisma dynamically
    const { prisma } = await import('../../../src/db')
    
    // Test database connection
    await prisma.$queryRaw`SELECT 1`
    
    // Try to query users table
    const userCount = await prisma.user.count()
    
    return NextResponse.json({ 
      status: 'ok',
      database: 'connected',
      userCount: userCount 
    })
    
  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json({ 
      error: 'Database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}