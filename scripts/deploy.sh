#!/bin/bash

# Deployment script for Fly.io
set -e

echo "🚀 Starting deployment to Fly.io..."

# Check if fly is installed
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI is not installed. Please install it first:"
    echo "   curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if user is logged in
if ! fly auth whoami &> /dev/null; then
    echo "❌ You are not logged in to Fly. Please run:"
    echo "   fly auth login"
    exit 1
fi

# Check if required secrets are set
echo "🔑 Checking required secrets..."
REQUIRED_SECRETS=("TELEGRAM_TOKEN" "DATABASE_URL")

for secret in "${REQUIRED_SECRETS[@]}"; do
    if ! fly secrets list | grep -q "$secret"; then
        echo "❌ Required secret $secret is not set. Set it with:"
        echo "   fly secrets set $secret=your_value_here"
        exit 1
    fi
done

echo "✅ All required secrets are set"

# Build and deploy
echo "📦 Building and deploying application..."
fly deploy

echo "🎯 Checking deployment health..."
sleep 10  # Give the app time to start

# Check if app is healthy
if fly status | grep -q "passing"; then
    echo "✅ Deployment successful! Application is healthy."
    
    # Show app URL
    APP_URL=$(fly info | grep -o 'https://[^[:space:]]*')
    echo "🌐 Your app is available at: $APP_URL"
    
    # Test webhook endpoint
    echo "🔗 Testing webhook endpoint..."
    if curl -s "$APP_URL/healthz" | grep -q "ok"; then
        echo "✅ Health check passed"
    else
        echo "⚠️  Health check failed - check logs"
    fi
    
else
    echo "❌ Deployment may have issues. Check status with:"
    echo "   fly status"
    echo "   fly logs"
    exit 1
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Set your webhook URL in Telegram Bot settings"
echo "2. Test your bot by sending /start"
echo "3. Monitor logs with: fly logs -f"
echo ""
echo "🔧 Useful commands:"
echo "   fly status    - Check app status"
echo "   fly logs -f   - Follow logs"
echo "   fly ssh console - SSH into app"
echo "   fly scale memory 1024 - Scale memory if needed"