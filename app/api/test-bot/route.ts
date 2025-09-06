import { NextResponse } from 'next/server'
import { connectDatabase, checkDatabaseHealth, prisma } from '../../../src/db'
import { handleStart } from '../../../src/bot/handlers/start'
import { t } from '../../../src/i18n'
import pino from 'pino'

const logger = pino({ name: 'test-bot' })

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: {}
  }

  try {
    // Test 1: Environment variables
    results.tests.envVars = {
      TELEGRAM_TOKEN: !!process.env.TELEGRAM_TOKEN,
      DATABASE_URL: !!process.env.DATABASE_URL,
      TIMEZONE: process.env.TIMEZONE,
      APP_BASE_URL: process.env.APP_BASE_URL
    }

    // Test 2: Database connection (regular)
    try {
      await connectDatabase()
      const isHealthy = await checkDatabaseHealth()
      results.tests.database = {
        connected: true,
        healthy: isHealthy,
        connectionUrl: process.env.DATABASE_URL ? 'Set' : 'Not set'
      }
    } catch (error) {
      results.tests.database = {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        connectionUrl: process.env.DATABASE_URL ? 'Set' : 'Not set'
      }
    }

    // Test 2b: Simple connection test
    try {
      const { PrismaClient } = require('@prisma/client')
      const testPrisma = new PrismaClient({
        log: ['error', 'warn'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      })
      
      // Simple connection test
      await testPrisma.$queryRaw`SELECT NOW() as current_time`
      const userCount = await testPrisma.user.count()
      await testPrisma.$disconnect()
      
      results.tests.simplePrisma = {
        connected: true,
        userCount,
        message: 'Direct Prisma connection successful'
      }
    } catch (error) {
      results.tests.simplePrisma = {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
      }
    }

    // Test 3: Prisma client
    try {
      const userCount = await prisma.user.count()
      results.tests.prisma = {
        working: true,
        userCount
      }
    } catch (error) {
      results.tests.prisma = {
        working: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 4: Translation system
    try {
      const greeting = t('greet')
      results.tests.translations = {
        working: true,
        sampleText: greeting.substring(0, 50) + '...'
      }
    } catch (error) {
      results.tests.translations = {
        working: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 5: Mock start handler
    try {
      const mockCtx = {
        from: { id: 12345, first_name: 'Test', username: 'testuser' },
        reply: async (text: string) => {
          results.tests.startHandler.response = text
          return Promise.resolve()
        }
      }

      await handleStart(mockCtx as any)
      results.tests.startHandler = {
        working: true,
        ...results.tests.startHandler
      }
    } catch (error) {
      results.tests.startHandler = {
        working: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    }

    results.success = true
  } catch (error) {
    results.success = false
    results.error = error instanceof Error ? error.message : 'Unknown error'
  }

  return NextResponse.json(results, { status: 200 })
}