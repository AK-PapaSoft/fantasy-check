import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('Cron job called')
    
    // Get the job type from query parameter
    const { searchParams } = new URL(request.url)
    const jobType = searchParams.get('job')
    
    if (jobType === 'daily-digest') {
      console.log('Daily digest job triggered via cron')
      return NextResponse.json({ success: true, job: jobType, message: 'Daily digest job triggered - implementation pending' })
    } else if (jobType === 'cache-refresh') {
      console.log('Cache refresh job triggered via cron')
      return NextResponse.json({ success: true, job: jobType, message: 'Cache refresh job triggered - implementation pending' })
    } else {
      console.log(`Unknown job type: ${jobType}`)
      return NextResponse.json({ error: 'Unknown job type' }, { status: 400 })
    }

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}