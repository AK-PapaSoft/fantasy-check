#!/bin/bash

# Fresh deployment script for Fly.io - handles conflicts and errors
set -e

echo "🚀 Fresh deployment to Fly.io..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if fly is installed
if ! command -v fly &> /dev/null; then
    echo -e "${RED}❌ Fly CLI is not installed. Please install it first:${NC}"
    echo "   curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if user is logged in
if ! fly auth whoami &> /dev/null; then
    echo -e "${RED}❌ You are not logged in to Fly. Please run:${NC}"
    echo "   fly auth login"
    exit 1
fi

# Step 1: Clean up any existing problematic apps
echo -e "${YELLOW}🧹 Checking for existing apps...${NC}"
if fly apps list | grep -q "sleeper-nfl-bot"; then
    echo -e "${YELLOW}⚠️  Found existing sleeper-nfl-bot app. Do you want to destroy it? (y/N)${NC}"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        fly apps destroy sleeper-nfl-bot --yes
        echo -e "${GREEN}✅ Old app destroyed${NC}"
    else
        echo -e "${YELLOW}⚠️  Using existing app - this might cause conflicts${NC}"
    fi
fi

# Step 2: Create new app with generated name
echo -e "${YELLOW}📱 Creating new Fly.io app...${NC}"
APP_NAME=$(fly launch --no-deploy --generate-name --json | jq -r '.name')

if [ -z "$APP_NAME" ] || [ "$APP_NAME" = "null" ]; then
    echo -e "${RED}❌ Failed to create app. Trying alternative method...${NC}"
    # Alternative: let user specify name
    echo -e "${YELLOW}Please enter a unique app name (or press Enter for auto-generated):${NC}"
    read -r CUSTOM_NAME
    
    if [ -n "$CUSTOM_NAME" ]; then
        APP_NAME="$CUSTOM_NAME"
        fly apps create "$APP_NAME"
    else
        # Generate random name
        APP_NAME="sleeper-bot-$(date +%s | tail -c 6)"
        fly apps create "$APP_NAME"
    fi
fi

echo -e "${GREEN}✅ Created app: $APP_NAME${NC}"

# Step 3: Update fly.toml with correct app name
echo -e "${YELLOW}📝 Updating fly.toml...${NC}"
sed -i.bak "s/app = \".*\"/app = \"$APP_NAME\"/" fly.toml
echo -e "${GREEN}✅ Updated fly.toml with app name: $APP_NAME${NC}"

# Step 4: Create PostgreSQL database
echo -e "${YELLOW}🗄️ Creating PostgreSQL database...${NC}"
if ! fly postgres create --name "$APP_NAME-db" --region ams --vm-size shared-cpu-1x --volume-size 10; then
    echo -e "${RED}❌ Failed to create database. Trying with different settings...${NC}"
    fly postgres create --name "$APP_NAME-db"
fi

# Step 5: Attach database
echo -e "${YELLOW}🔗 Attaching database...${NC}"
fly postgres attach --app "$APP_NAME" "$APP_NAME-db"

# Step 6: Set required secrets
echo -e "${YELLOW}🔑 Setting up secrets...${NC}"
echo -e "${YELLOW}Please enter your Telegram Bot Token:${NC}"
read -s TELEGRAM_TOKEN

if [ -z "$TELEGRAM_TOKEN" ]; then
    echo -e "${RED}❌ Telegram token is required${NC}"
    exit 1
fi

fly secrets set TELEGRAM_TOKEN="$TELEGRAM_TOKEN" --app "$APP_NAME"
fly secrets set APP_BASE_URL="https://$APP_NAME.fly.dev" --app "$APP_NAME"

echo -e "${GREEN}✅ Secrets configured${NC}"

# Step 7: Deploy the application
echo -e "${YELLOW}📦 Deploying application...${NC}"
if fly deploy --app "$APP_NAME"; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    
    # Step 8: Check health
    echo -e "${YELLOW}🏥 Checking application health...${NC}"
    sleep 15
    
    if curl -sf "https://$APP_NAME.fly.dev/healthz" > /dev/null; then
        echo -e "${GREEN}✅ Application is healthy!${NC}"
    else
        echo -e "${YELLOW}⚠️  Health check failed, checking logs...${NC}"
        fly logs --app "$APP_NAME" | tail -20
    fi
    
    # Step 9: Success information
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo ""
    echo -e "${GREEN}📋 Your app information:${NC}"
    echo -e "   App Name: ${GREEN}$APP_NAME${NC}"
    echo -e "   URL: ${GREEN}https://$APP_NAME.fly.dev${NC}"
    echo -e "   Health: ${GREEN}https://$APP_NAME.fly.dev/healthz${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Useful commands:${NC}"
    echo -e "   fly status --app $APP_NAME"
    echo -e "   fly logs -f --app $APP_NAME"
    echo -e "   fly ssh console --app $APP_NAME"
    echo ""
    echo -e "${YELLOW}📱 Next steps:${NC}"
    echo "1. Test your bot by sending /start in Telegram"
    echo "2. Monitor logs with: fly logs -f --app $APP_NAME"
    echo "3. Your bot webhook is automatically configured"
    
else
    echo -e "${RED}❌ Deployment failed${NC}"
    echo -e "${YELLOW}📋 Troubleshooting:${NC}"
    echo "1. Check logs: fly logs --app $APP_NAME"
    echo "2. Check status: fly status --app $APP_NAME"
    echo "3. Verify secrets: fly secrets list --app $APP_NAME"
    exit 1
fi