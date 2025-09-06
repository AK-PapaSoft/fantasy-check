import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('=== WEBHOOK RECEIVED ===', new Date().toISOString())
    
    const body: any = await request.json()
    console.log('=== BODY ===', JSON.stringify(body, null, 2))
    
    // Check for commands
    const message = body?.message
    const text = message?.text
    const chatId = message?.chat?.id
    
    if (!text || !chatId) {
      console.log('=== NO TEXT OR CHAT_ID ===')
      return NextResponse.json({ ok: true })
    }
    
    console.log('=== COMMAND ===', text)
    
    let responseText = ''
    
    if (text === '/start') {
      responseText = '🚀 Fantasy Check Bot працює! v2.0 - ' + new Date().toISOString()
    } else if (text === '/help') {
      responseText = `🔧 **Доступні команди:**
• /start - Почати роботу з ботом  
• /help - Показати цю довідку
• /link_sleeper <нік> - Підключити Sleeper

Bot працює на: https://fantasy-check.vercel.app/`
    } else {
      console.log('=== UNKNOWN COMMAND ===')
      return NextResponse.json({ ok: true })
    }
    
    // Send via Telegram API
    const telegramToken = process.env.TELEGRAM_TOKEN
    if (!telegramToken) {
      console.log('=== NO TELEGRAM_TOKEN ===')
      return NextResponse.json({ ok: true, message: 'No token configured' })
    }
    
    const telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`
    
    console.log('=== SENDING RESPONSE ===', responseText.substring(0, 100))
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: responseText,
        parse_mode: 'Markdown'
      }),
    })
    
    const result = await response.json()
    console.log('=== TELEGRAM RESPONSE ===', result)
    
    return NextResponse.json({ ok: true })
    
  } catch (error) {
    console.error('=== WEBHOOK ERROR ===', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}