import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('=== SIMPLE WEBHOOK ===', new Date().toISOString())
    
    const telegramToken = process.env.TELEGRAM_TOKEN
    if (!telegramToken) {
      console.log('=== NO TELEGRAM_TOKEN ===')
      return NextResponse.json({ ok: true, message: 'No token configured' })
    }

    const body = await request.json() as any
    console.log('=== REQUEST BODY ===', JSON.stringify(body, null, 2))
    
    const message = body.message
    if (!message || !message.text) {
      return NextResponse.json({ ok: true })
    }
    
    const chatId = message.chat.id
    const text = message.text
    
    console.log(`=== MESSAGE: ${text} FROM CHAT: ${chatId} ===`)
    
    if (text === '/link_sleeper Disgusting23') {
      try {
        // Direct Sleeper API call
        const userResponse = await fetch(`https://api.sleeper.app/v1/user/Disgusting23`)
        
        if (!userResponse.ok) {
          await sendMessage(telegramToken, chatId, '❌ User not found in Sleeper')
          return NextResponse.json({ ok: true })
        }
        
        const userData = await userResponse.json() as any
        const leaguesResponse = await fetch(`https://api.sleeper.app/v1/user/${userData.user_id}/leagues/nfl/2024`)
        const leagues = leaguesResponse.ok ? await leaguesResponse.json() as any[] : []
        
        const responseMessage = `✅ **User found: ${userData.display_name || userData.username}**

👤 **Profile:**
• ID: ${userData.user_id}
• Username: ${userData.username}

🏈 **NFL 2024 Leagues (${leagues.length}):**
${leagues.slice(0, 5).map((league: any, index: number) => 
  `${index + 1}. ${league.name}`
).join('\n')}

💬 **Support:** @anton_kravchuk23`
        
        await sendMessage(telegramToken, chatId, responseMessage)
        
      } catch (error) {
        console.error('Sleeper API error:', error)
        await sendMessage(telegramToken, chatId, '❌ **Connection error**\n\nCould not connect to Sleeper API.\n\n💬 **Support:** @anton_kravchuk23')
      }
    } else if (text === '/help') {
      const helpMessage = `🔧 **Fantasy Check - Help**

🏈 **Main commands:**
• /start - Start the bot
• /help - Show this help
• /link_sleeper <username> - Connect Sleeper profile

💬 **Support:** @anton_kravchuk23`
      
      await sendMessage(telegramToken, chatId, helpMessage)
    } else if (text === '/start') {
      await sendMessage(telegramToken, chatId, '🚀 Fantasy Check Bot is working! Welcome!')
    }
    
    return NextResponse.json({ ok: true })
    
  } catch (error) {
    console.error('=== SIMPLE WEBHOOK ERROR ===', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function sendMessage(token: string, chatId: number, text: string) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      }),
    })
    
    if (!response.ok) {
      console.error('Failed to send message:', await response.text())
    }
  } catch (error) {
    console.error('Error sending message:', error)
  }
}