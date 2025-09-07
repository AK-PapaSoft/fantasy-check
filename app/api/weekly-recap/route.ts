import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('=== WEEKLY RECAP TRIGGERED ===', new Date().toISOString())
    
    const telegramToken = process.env.TELEGRAM_TOKEN
    if (!telegramToken) {
      console.log('=== NO TELEGRAM_TOKEN ===')
      return NextResponse.json({ ok: false, message: 'No token configured' })
    }

    // Get current NFL state
    const nflStateResponse = await fetch('https://api.sleeper.app/v1/state/nfl')
    const nflState = nflStateResponse.ok ? await nflStateResponse.json() as any : null
    
    if (!nflState) {
      console.log('=== COULD NOT GET NFL STATE ===')
      return NextResponse.json({ ok: false, message: 'Could not get NFL state' })
    }

    const currentWeek = nflState.week
    const season = nflState.season
    const lastWeek = currentWeek > 1 ? currentWeek - 1 : 18 // Handle week 1 edge case

    console.log(`=== PROCESSING WEEK ${lastWeek} RECAP FOR SEASON ${season} ===`)

    // In a real implementation, we would:
    // 1. Get all users from the database
    // 2. Get their connected Sleeper accounts
    // 3. Get their leagues and last week's results
    // 4. Send personalized recap messages

    // For now, let's create a test message for our known user
    const testUserTgId = 123456789 // This would come from database
    
    const weeklyRecapMessage = `📈 **Тижневий підсумок** (Тиждень ${lastWeek})

🏈 **Ваші результати:**
• Dynasty lose pool: 3 місце (85.4 очок)
• Sporthub League: 1 місце (126.7 очок) 🏆
• Dynasty BestBall: 7 місце (98.2 очок)
• SH patrons dynasty: 4 місце (110.1 очок)

📊 **Загальна статистика:**
🏆 Перемоги: 2/4
📉 Поразки: 2/4
⭐ Найкращий матч: 126.7 очок

🔮 **Цього тижня (${currentWeek}):**
• 3 важливих матчі
• 2 гравці на bye-week
• Рекомендації по складу команди

⏰ Оновлено: ${new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' })}
💬 Питання? @anton_kravchuk23`

    // Send to test user
    await sendMessage(telegramToken, testUserTgId, weeklyRecapMessage)
    
    console.log('=== WEEKLY RECAP SENT SUCCESSFULLY ===')
    return NextResponse.json({ ok: true, message: 'Weekly recap sent' })
    
  } catch (error) {
    console.error('=== WEEKLY RECAP ERROR ===', error)
    return NextResponse.json({ 
      ok: false,
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
        disable_web_page_preview: true
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to send weekly recap message:', errorText)
    } else {
      console.log('Weekly recap message sent successfully')
    }
  } catch (error) {
    console.error('Error sending weekly recap message:', error)
  }
}