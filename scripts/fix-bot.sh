#!/bin/bash

# Fix Telegram Bot Webhook Script
BOT_TOKEN="7977291846:AAGEDCQkNT7ZraeCsbzNHoobO25dCYYqsJI"
WEBHOOK_URL="https://sleeper-bot-42819.fly.dev/webhook"

echo "🔍 Checking current webhook status..."
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | jq '.'

echo -e "\n🔧 Setting webhook URL..."
RESULT=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
     -H "Content-Type: application/json" \
     -d "{\"url\": \"${WEBHOOK_URL}\"}")

echo $RESULT | jq '.'

if echo $RESULT | grep -q '"ok":true'; then
    echo "✅ Webhook set successfully!"
else
    echo "❌ Failed to set webhook"
    exit 1
fi

echo -e "\n🔍 Verifying webhook was set..."
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | jq '.'

echo -e "\n🤖 Testing bot info..."
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getMe" | jq '.result.username'

echo -e "\n✅ Setup complete! Now try sending /start to your bot on Telegram"
echo "📱 Bot username should be shown above"
echo "📋 Monitor logs with: fly logs -a sleeper-bot-42819 -f"