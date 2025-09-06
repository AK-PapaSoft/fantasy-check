import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Log the incoming request
    console.log('=== WEBHOOK2 RECEIVED ===', JSON.stringify(body, null, 2))
    
    // Check if it's a /start or /help command
    const message = body?.message
    const text = message?.text
    const chatId = message?.chat?.id
    
    if (!text || !chatId) {
      return NextResponse.json({ ok: true })
    }
    
    let responseText = ''
    
    if (text === '/start') {
      responseText = '🚀 START WORKING! New webhook v2: ' + new Date().toISOString()
    } else if (text === '/help') {
      responseText = '🔥 HELP WORKING! New webhook v2: ' + new Date().toISOString()
    } else {
      return NextResponse.json({ ok: true })
    }
    
    // Send response directly via Telegram API
    const telegramToken = process.env.TELEGRAM_TOKEN
    const telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: responseText,
      }),
    })
    
    const result = await response.json()
    console.log('=== TELEGRAM API RESPONSE ===', result)
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('=== WEBHOOK2 ERROR ===', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}