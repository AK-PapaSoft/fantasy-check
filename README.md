# Sleeper NFL Bot

Production-ready Telegram bot for NFL fantasy football with Sleeper integration. Built with Node.js, TypeScript, and deployed on Fly.io.

## 🏈 Features

- **Telegram Bot Integration**: Full-featured bot with Ukrainian localization
- **Sleeper API Integration**: Fetch leagues, rosters, matchups, and scores
- **Daily Digests**: Automated daily summaries at 8 AM user time
- **REST API**: HTTP endpoints for web frontend integration
- **Real-time Updates**: In-memory caching with automatic refresh
- **Production Ready**: Docker, Fly.io deployment, health checks, monitoring

### 🤖 Bot Commands

- `/start` - Start using the bot
- `/link_sleeper <username>` - Link your Sleeper account
- `/leagues` - View your fantasy leagues
- `/today` - Get today's fantasy digest
- `/timezone` - Change your timezone
- `/help` - Show available commands

### 🌐 HTTP API Endpoints

- `GET /healthz` - Health check
- `POST /api/v1/users/{userId}/link-sleeper` - Link Sleeper account
- `GET /api/v1/users/{userId}/leagues` - Get user leagues
- `POST /api/v1/users/{userId}/digest` - Get fantasy digest
- `POST /api/v1/leagues/{leagueId}/refresh` - Refresh league data

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Telegram Bot Token (from @BotFather)
- Fly.io account (for production deployment)

### Local Development

1. **Clone and install dependencies**
   ```bash
   git clone <your-repo-url>
   cd sleeper-nfl-bot
   npm install
   ```

2. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Setup database**
   ```bash
   # Start PostgreSQL locally or use Docker
   docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15
   
   # Run migrations
   npm run prisma:generate
   npm run prisma:migrate
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   The bot will start in polling mode for development.

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `TELEGRAM_TOKEN` | ✅ | Telegram bot token from @BotFather | - |
| `DATABASE_URL` | ✅ | PostgreSQL connection string | - |
| `SLEEPER_API_BASE` | ❌ | Sleeper API base URL | `https://api.sleeper.app/v1` |
| `APP_BASE_URL` | ⚠️ | Your app URL (required for webhook) | - |
| `TIMEZONE` | ❌ | Default timezone | `Europe/Brussels` |
| `PORT` | ❌ | HTTP server port | `8080` |
| `NODE_ENV` | ❌ | Environment mode | `development` |

## 🏭 Production Deployment

### Deploy to Fly.io

1. **Install Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth login
   ```

2. **Create Fly.io app**
   ```bash
   fly launch --no-deploy
   ```

3. **Create PostgreSQL database**
   ```bash
   fly postgres create
   fly postgres attach --app sleeper-nfl-bot
   ```

4. **Set secrets**
   ```bash
   fly secrets set TELEGRAM_TOKEN=your_bot_token_here
   fly secrets set APP_BASE_URL=https://your-app.fly.dev
   ```

5. **Deploy**
   ```bash
   # Use the provided script
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   
   # Or deploy manually
   fly deploy
   ```

6. **Set webhook**
   After successful deployment, the bot will automatically set up webhook at `https://your-app.fly.dev/webhook`.

### Manual Deployment Steps

1. **Environment Setup**
   ```bash
   # Production environment variables
   export NODE_ENV=production
   export PORT=8080
   export DATABASE_URL="postgresql://..."
   export TELEGRAM_TOKEN="your_token"
   export APP_BASE_URL="https://your-domain.com"
   ```

2. **Database Migration**
   ```bash
   npm run prisma:migrate:deploy
   ```

3. **Build and Start**
   ```bash
   npm run build
   npm start
   ```

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Structure

- `tests/unit/` - Unit tests for individual modules
- `tests/integration/` - API integration tests
- `tests/setup.ts` - Global test configuration

### Key Test Coverage

- ✅ Sleeper API client with mocked HTTP calls
- ✅ i18n translation system
- ✅ Timezone utilities
- ✅ HTTP API endpoints
- ✅ Error handling and validation

## 📊 Monitoring & Maintenance

### Health Monitoring

- Health check endpoint: `GET /healthz`
- Database connectivity monitoring
- Application uptime tracking
- Docker health checks in production

### Logging

The application uses structured logging with `pino`:

```bash
# View logs in production
fly logs -f

# Local development logs are pretty-printed
npm run dev
```

### Database Management

```bash
# View data in Prisma Studio
npm run prisma:studio

# Create new migration
npm run prisma:migrate

# Reset database (development only)
npx prisma migrate reset
```

### Cache Management

The application uses in-memory caching for Sleeper API responses:
- User data: 5 minutes TTL
- League data: 2 minutes TTL  
- Matchups: 1 minute TTL during games
- Cache automatically refreshes every 5 minutes via cron job

## 🏗️ Architecture

### Project Structure

```
sleeper-nfl-bot/
├── src/
│   ├── bot/          # Telegram bot handlers
│   ├── http/         # Express HTTP API
│   ├── services/     # Business logic
│   ├── i18n/         # Internationalization
│   ├── db/           # Database client
│   ├── jobs/         # Cron jobs
│   ├── utils/        # Utilities
│   └── index.ts      # Application entry point
├── tests/            # Test files
├── prisma/           # Database schema
├── scripts/          # Deployment scripts
├── Dockerfile        # Docker configuration
└── fly.toml          # Fly.io configuration
```

### Technology Stack

- **Runtime**: Node.js 20 + TypeScript
- **Bot Framework**: Telegraf
- **HTTP Server**: Express
- **Database**: PostgreSQL + Prisma ORM
- **Caching**: In-memory (Map-based)
- **Scheduling**: node-cron
- **Logging**: Pino
- **Testing**: Jest
- **Deployment**: Docker + Fly.io

### Data Flow

1. **User Interaction**: Commands via Telegram → Bot handlers
2. **Sleeper Integration**: API calls → Cache → Database
3. **Daily Digests**: Cron job → Generate messages → Send via bot
4. **HTTP API**: External requests → Services → JSON responses

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server with watch
npm run build        # Build TypeScript to JavaScript
npm start            # Start production server
npm test             # Run tests
npm run lint         # ESLint code checking
npm run type-check   # TypeScript type checking
```

### Adding New Features

1. **New Bot Commands**:
   - Add handler in `src/bot/handlers/`
   - Register in `src/bot/index.ts`
   - Add i18n keys in `src/i18n/uk.ts`

2. **New API Endpoints**:
   - Add route in `src/http/routes/`
   - Update OpenAPI spec in `openapi.yaml`
   - Add integration tests

3. **Database Changes**:
   - Update `prisma/schema.prisma`
   - Run `npm run prisma:migrate`
   - Update service layer

### Code Style

- ESLint + TypeScript strict mode
- Prettier for formatting
- Conventional commit messages
- 100% type coverage required

## 🌍 Internationalization

Currently supports:
- 🇺🇦 **Ukrainian** (uk) - Primary language

Ready for expansion:
- 🇺🇸 **English** (en) - Prepared structure

To add new language:
1. Create `src/i18n/en.ts` with translations
2. Update `src/i18n/index.ts` languages map
3. Add language selection in user settings

## 🔮 Roadmap

### Phase 1 - MVP ✅
- [x] Sleeper NFL integration
- [x] Basic bot commands
- [x] Daily digests
- [x] HTTP API
- [x] Fly.io deployment

### Phase 2 - Enhancements
- [ ] NBA support
- [ ] English localization
- [ ] Advanced alerts (game start, score updates)
- [ ] Player news integration
- [ ] Lineup optimization suggestions

### Phase 3 - Platform
- [ ] Web dashboard
- [ ] Mobile app
- [ ] League administration features
- [ ] Social features (league chat)
- [ ] Premium features

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Commit Convention

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Maintenance tasks

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- **Issues**: [GitHub Issues](https://github.com/your-username/sleeper-nfl-bot/issues)
- **Telegram**: Contact bot admin
- **Email**: your-email@example.com

## 🙏 Acknowledgments

- [Sleeper API](https://docs.sleeper.app/) for fantasy football data
- [Telegraf](https://telegraf.js.org/) for Telegram bot framework
- [Fly.io](https://fly.io/) for hosting platform
- NFL for the amazing sport that makes this all possible! 🏈

---

**Made with ❤️ for fantasy football enthusiasts**