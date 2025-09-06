export const en = {
  // Greetings and basic responses
  greet: 'Hello! I\'m a bot for Sleeper NFL. Add your profile with /link_sleeper username.\n\n🔧 **Available commands:**\n• /link_sleeper <username> - Connect Sleeper\n• /leagues - My leagues\n• /today - Week digest\n• /help - Help',
  greet_sporthub: 'Hello! I\'m a bot for Sleeper NFL. Add your profile with /link_sleeper username.\n\n👋 Hello to SportHub friends!\n\n🔧 **Available commands:**\n• /link_sleeper <username> - Connect Sleeper\n• /leagues - My leagues\n• /today - Week digest\n• /help - Full help',
  help: `🏈 *Bot commands:*

✅ **Basic:**
• /start - Start working with the bot
• /help - Show this help
• /feedback - Send feedback to developers
• /lang - Change language

✅ **Fantasy Football:**
• /link_sleeper <username> - Link Sleeper profile
• /leagues - Show my leagues and settings
• /today - Current week digest

🔔 **Automatic notifications:**
• Reminder 1 hour before draft
• Notification when it's your turn to pick
• Smart notifications about important events
• No spam - only important information!`,

  // Sleeper integration
  linked_ok: 'Linked Sleeper user: {username}',
  linking_user: 'Linking user {username}...',
  user_not_found: 'User {username} not found in Sleeper. Check the username.',
  no_leagues_found: 'User {username} has no active NFL leagues for season {season}.',
  leagues_synced: 'Synced {count} leagues.',

  // League management
  your_leagues: '🏆 *Your leagues:*',
  league_info: '*{name}*\nSeason: {season} | Sport: {sport}\nTeam: {teamId}',
  no_leagues: 'You have no connected leagues. Use /link_sleeper username.',
  league_details: 'League details',
  enable_alerts: 'Enable alerts',
  disable_alerts: 'Disable alerts',
  remove_league: 'Remove league',

  // Daily digest
  digest_header: '🏈 Sleeper | League: {league} | Week {week}',
  digest_team: 'Team: {team}',
  digest_opponent: 'Opponent: {opponent}',
  digest_score: 'Score: {myScore} – {oppScore}',
  digest_top_players: 'Top players: {players}',
  digest_upcoming: 'Playing today: {games}',
  digest_reminders: '⚠️ Reminders: {reminders}',
  no_games: 'No games today. Have a great day!',
  no_matchups: 'Matchups for this week are not available yet.',

  // Alerts and reminders
  pregame_alert: '🚨 Game starts in 60 minutes!\nLeague: {league}\nCheck your lineup.',
  waiver_reminder: 'Don\'t forget about waivers!',
  lineup_reminder: 'Check your team lineup!',

  // Draft notifications
  draft_starting_soon: '🚨 Draft starts in 1 hour!\n\nLeague: {league}\nStart time: {startTime}\n\nPrepare your strategy!',
  draft_your_turn: '⏰ Your turn in the draft!\n\nLeague: {league}\nRound: {round}\nPick: #{pickNumber}\n\nYou have {timer} seconds to choose!',
  draft_completed: '✅ Draft completed!\nLeague: {league}\n\nGood luck this season!',

  // Timezone
  current_timezone: 'Current timezone: {timezone}',
  timezone_changed: 'Timezone changed to: {timezone}',
  invalid_timezone: 'Invalid timezone. Examples: Europe/Kiev, America/New_York',
  timezone_prompt: 'Enter new timezone (e.g., Europe/Kiev):',

  // Language
  current_language: 'Current language: {language}',
  language_changed: 'Language changed to: {language}',
  invalid_language: 'Invalid language. Available languages: {languages}',
  language_prompt: 'Choose language:\n• /lang en - English\n• /lang uk - Українська',

  // Errors
  error_generic: 'An error occurred. Please try again later.',
  error_sleeper_api: 'Error connecting to Sleeper API. Try again later.',
  error_database: 'Database error. Contact administrator.',
  error_invalid_username: 'Invalid username format. Use only letters, numbers and underscores.',
  error_command_format: 'Invalid command format. Use: {format}',

  // Success messages
  alerts_enabled: 'Alerts enabled for league: {league}',
  alerts_disabled: 'Alerts disabled for league: {league}',
  league_removed: 'League removed: {league}',

  // Feedback
  feedback_prompt: '💬 Write your feedback or suggestion in the next message:',
  feedback_sent: '✅ Thank you for your feedback! Your message has been sent to developers.',
  feedback_error: '❌ Error sending feedback. Please try again later.',

  // Draft notifications for synced leagues
  draft_scheduled_notification: '🗓️ You have a scheduled draft!\n\nLeague: {league}\nDate: {startTime}\n\nDon\'t forget to prepare!',

  // API responses
  api_success: 'Operation completed successfully',
  api_user_not_found: 'User not found',
  api_league_not_found: 'League not found',
  api_invalid_request: 'Invalid request',
};