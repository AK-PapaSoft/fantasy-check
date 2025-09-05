export const uk = {
  // Greetings and basic responses
  greet: 'Привіт! Я бот для Sleeper NFL. Додай свій профіль командою /link_sleeper нікнейм.\n\n🔧 **Доступні команди:**\n• /link_sleeper <нік> - Підключити Sleeper\n• /leagues - Мої ліги\n• /today - Дайджест тижня\n• /help - Довідка',
  greet_sporthub: 'Привіт! Я бот для Sleeper NFL. Додай свій профіль командою /link_sleeper нікнейм.\n\n👋 Привіт друзям зі SportHub!\n\n🔧 **Доступні команди:**\n• /link_sleeper <нік> - Підключити Sleeper\n• /leagues - Мої ліги\n• /today - Дайджест тижня\n• /help - Повна довідка',
  help: `🏈 *Команди бота:*

✅ **Основні:**
• /start - Почати роботу з ботом
• /help - Показати цю довідку
• /feedback - Надіслати відгук розробникам
• /lang - Змінити мову

✅ **Fantasy Football:**
• /link_sleeper <нік> - Прив'язати профіль Sleeper
• /leagues - Показати мої ліги та налаштування
• /today - Дайджест поточного тижня

🔔 **Автоматичні сповіщення:**
• Нагадування за 1 годину до драфту
• Повідомлення коли ваша черга піку
• Розумні сповіщення про важливі події
• Без спаму - тільки важлива інформація!`,

  // Sleeper integration
  linked_ok: 'Зв\'язав користувача Sleeper: {username}',
  linking_user: 'Підключаю користувача {username}...',
  user_not_found: 'Користувача {username} не знайдено в Sleeper. Перевір правильність нікнейму.',
  no_leagues_found: 'У користувача {username} немає активних NFL ліг на сезон {season}.',
  leagues_synced: 'Синхронізовано {count} ліг.',

  // League management
  your_leagues: '🏆 *Твої ліги:*',
  league_info: '*{name}*\nСезон: {season} | Спорт: {sport}\nКоманда: {teamId}',
  no_leagues: 'У тебе немає підключених ліг. Використай /link_sleeper нікнейм.',
  league_details: 'Деталі ліги',
  enable_alerts: 'Увімкнути алерти',
  disable_alerts: 'Вимкнути алерти',
  remove_league: 'Видалити лігу',

  // Daily digest
  digest_header: '🏈 Sleeper | Ліга: {league} | Тиждень {week}',
  digest_team: 'Команда: {team}',
  digest_opponent: 'Опонент: {opponent}',
  digest_score: 'Рахунок: {myScore} – {oppScore}',
  digest_top_players: 'Топ гравці: {players}',
  digest_upcoming: 'Сьогодні грають: {games}',
  digest_reminders: '⚠️ Нагадування: {reminders}',
  no_games: 'Сьогодні ігор немає. Гарного дня!',
  no_matchups: 'Матчі на цей тиждень ще не доступні.',

  // Alerts and reminders
  pregame_alert: '🚨 Гра починається через 60 хвилин!\nЛіга: {league}\nПеревір свій склад.',
  waiver_reminder: 'Не забудь про waivers!',
  lineup_reminder: 'Перевір склад команди!',

  // Draft notifications
  draft_starting_soon: '🚨 Драфт починається через 1 годину!\n\nЛіга: {league}\nЧас початку: {startTime}\n\nПідготуйте свою стратегію!',
  draft_your_turn: '⏰ Ваша черга в драфті!\n\nЛіга: {league}\nРаунд: {round}\nПік: #{pickNumber}\n\nУ вас {timer} секунд на вибір!',
  draft_completed: '✅ Драфт завершено!\nЛіга: {league}\n\nУдачі в сезоні!',

  // Timezone
  current_timezone: 'Поточний часовий пояс: {timezone}',
  timezone_changed: 'Часовий пояс змінено на: {timezone}',
  invalid_timezone: 'Невірний часовий пояс. Приклади: Europe/Kiev, America/New_York',
  timezone_prompt: 'Введи новий часовий пояс (наприклад, Europe/Kiev):',

  // Language
  current_language: 'Поточна мова: {language}',
  language_changed: 'Мова змінена на: {language}',
  invalid_language: 'Невірна мова. Доступні мови: {languages}',
  language_prompt: 'Виберіть мову:\n• /lang en - English\n• /lang uk - Українська',

  // Errors
  error_generic: 'Сталася помилка. Спробуй ще раз пізніше.',
  error_sleeper_api: 'Помилка при звертанні до Sleeper API. Спробуй пізніше.',
  error_database: 'Помилка бази даних. Зверніться до адміністратора.',
  error_invalid_username: 'Невірний формат нікнейму. Використай лише букви, цифри та підкреслення.',
  error_command_format: 'Невірний формат команди. Використай: {format}',

  // Success messages
  alerts_enabled: 'Алерти увімкнено для ліги: {league}',
  alerts_disabled: 'Алерти вимкнено для ліги: {league}',
  league_removed: 'Лігу видалено: {league}',

  // Feedback
  feedback_prompt: '💬 Напишіть ваш відгук або пропозицію в наступному повідомленні:',
  feedback_sent: '✅ Дякуємо за відгук! Ваше повідомлення надіслано розробникам.',
  feedback_error: '❌ Помилка при надсиланні відгуку. Спробуйте пізніше.',

  // Draft notifications for synced leagues
  draft_scheduled_notification: '🗓️ У вас запланований драфт!\n\nЛіга: {league}\nДата: {startTime}\n\nНе забудьте підготуватися!',

  // API responses
  api_success: 'Операція виконана успішно',
  api_user_not_found: 'Користувача не знайдено',
  api_league_not_found: 'Лігу не знайдено',
  api_invalid_request: 'Невірний запит',
};