'use client'

import { useState } from 'react'

export default function Home() {
  const [currentLang, setCurrentLang] = useState('uk')

  const toggleLanguage = () => {
    setCurrentLang(currentLang === 'uk' ? 'en' : 'uk')
  }

  return (
    <>
      <button className="lang-toggle" onClick={toggleLanguage}>
        <span className={currentLang === 'en' ? 'hidden' : ''}>🇺🇸 ENG</span>
        <span className={currentLang === 'uk' ? 'hidden' : ''}>🇺🇦 УКР</span>
      </button>

      <div className="container">
        {/* Ukrainian Version */}
        <div className={currentLang !== 'uk' ? 'hidden' : ''}>
          <div className="hero">
            <h1>
              <svg className="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Fantasy bot logo">
                <defs>
                  <linearGradient id="g-uk" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#16a34a"/>
                    <stop offset="100%" stopColor="#0ea5e9"/>
                  </linearGradient>
                  <filter id="s-uk" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="6" stdDeviation="12" floodOpacity="0.18"/>
                  </filter>
                </defs>
                <circle cx="256" cy="256" r="224" fill="url(#g-uk)" />
                <g filter="url(#s-uk)">
                  <path d="M356 172c-22-22-53-34-100-34s-78 12-100 34c-22 22-34 53-34 100s12 78 34 100c22 22 53 34 100 34h14c13 0 24 11 24 24v24l46-34c8-6 13-15 13-25v-3c29-19 43-53 43-100 0-47-12-78-34-100z" fill="#ffffff"/>
                </g>
                <g transform="translate(256 256) rotate(-18)">
                  <ellipse cx="0" cy="0" rx="120" ry="72" fill="#7c3f11"/>
                  <rect x="-110" y="-10" width="28" height="20" rx="10" fill="#ffffff"/>
                  <rect x="82" y="-10" width="28" height="20" rx="10" fill="#ffffff"/>
                  <rect x="-40" y="-6" width="80" height="12" rx="6" fill="#ffffff"/>
                  <rect x="-28" y="-22" width="8" height="32" rx="4" fill="#ffffff"/>
                  <rect x="-10" y="-22" width="8" height="32" rx="4" fill="#ffffff"/>
                  <rect x="8" y="-22" width="8" height="32" rx="4" fill="#ffffff"/>
                  <rect x="26" y="-22" width="8" height="32" rx="4" fill="#ffffff"/>
                </g>
              </svg>
              Fantasy Check
            </h1>
            <p className="subtitle">Розумний бот для Sleeper NFL Fantasy футболу</p>
            <div className="status">✅ Бот працює на https://fantasy-check.vercel.app/</div>
            <br/>
            <a href="https://t.me/FantasyCheckBot" className="telegram-link" target="_blank" rel="noopener noreferrer">
              📱 Відкрити в Telegram
            </a>
          </div>

          <div className="features">
            <div className="feature-card">
              <h3>🎯 Розумні сповіщення</h3>
              <p><strong>Без спаму!</strong> Отримуй повідомлення лише коли потрібно:</p>
              <ul>
                <li><strong>Вівторок 18:00</strong> - Нагадування про waivers</li>
                <li><strong>Середа 18:00</strong> - Перевірка команди (травми, пропуски)</li>
                <li><strong>Четвер-Понеділок 8:00</strong> - Тільки якщо твої гравці грають</li>
              </ul>
            </div>

            <div className="feature-card">
              <h3>🏆 Драфт підтримка</h3>
              <p>Повна підтримка драфтів:</p>
              <ul>
                <li><strong>За 1 годину</strong> - Сповіщення про початок</li>
                <li><strong>Твоя черга</strong> - Миттєві повідомлення</li>
                <li><strong>При додаванні ліг</strong> - Автоматичне виявлення запланованих драфтів</li>
              </ul>
            </div>

            <div className="feature-card">
              <h3>⚡ Зручні команди</h3>
              <div className="commands-grid">
                <div className="command">
                  <code>/start</code>
                  <div className="desc">Почати роботу з ботом</div>
                </div>
                <div className="command">
                  <code>/link_sleeper</code>
                  <div className="desc">Підключити свій Sleeper акаунт</div>
                </div>
                <div className="command">
                  <code>/leagues</code>
                  <div className="desc">Управління лігами та алертами</div>
                </div>
                <div className="command">
                  <code>/today</code>
                  <div className="desc">Отримати дайджест на сьогодні</div>
                </div>
                <div className="command">
                  <code>/timezone</code>
                  <div className="desc">Змінити часовий пояс</div>
                </div>
                <div className="command">
                  <code>/feedback</code>
                  <div className="desc">Надіслати відгук розробникам</div>
                </div>
              </div>
            </div>

            <div className="feature-card">
              <h3>🧠 Розумна аналітика</h3>
              <ul>
                <li><strong>Реальні імена гравців</strong> замість ID</li>
                <li><strong>Аналіз травм</strong> та пропусків команд</li>
                <li><strong>Один дайджест</strong> для всіх ліг</li>
                <li><strong>Часові пояси</strong> - всі повідомлення у вашому часі</li>
              </ul>
            </div>
          </div>

          <div className="feature-card" style={{textAlign: 'center'}}>
            <h3>🚀 Як почати?</h3>
            <ol style={{textAlign: 'left', maxWidth: '400px', margin: '0 auto'}}>
              <li>Натисни кнопку <strong>"Відкрити в Telegram"</strong> вище</li>
              <li>Надішли боту <code>/start</code></li>
              <li>Використай <code>/link_sleeper твій_нікнейм</code></li>
              <li>Готово! Бот почне надсилати розумні сповіщення</li>
            </ol>
            <p style={{marginTop: '20px', color: '#666'}}>
              👋 <strong>Привіт друзям зі SportHub!</strong><br/>
              Нові користувачі отримують спеціальне вітання
            </p>
          </div>
        </div>

        {/* English Version */}
        <div className={currentLang !== 'en' ? 'hidden' : ''}>
          <div className="hero">
            <h1>
              <svg className="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Fantasy bot logo">
                <defs>
                  <linearGradient id="g-en" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#16a34a"/>
                    <stop offset="100%" stopColor="#0ea5e9"/>
                  </linearGradient>
                  <filter id="s-en" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="6" stdDeviation="12" floodOpacity="0.18"/>
                  </filter>
                </defs>
                <circle cx="256" cy="256" r="224" fill="url(#g-en)" />
                <g filter="url(#s-en)">
                  <path d="M356 172c-22-22-53-34-100-34s-78 12-100 34c-22 22-34 53-34 100s12 78 34 100c22 22 53 34 100 34h14c13 0 24 11 24 24v24l46-34c8-6 13-15 13-25v-3c29-19 43-53 43-100 0-47-12-78-34-100z" fill="#ffffff"/>
                </g>
                <g transform="translate(256 256) rotate(-18)">
                  <ellipse cx="0" cy="0" rx="120" ry="72" fill="#7c3f11"/>
                  <rect x="-110" y="-10" width="28" height="20" rx="10" fill="#ffffff"/>
                  <rect x="82" y="-10" width="28" height="20" rx="10" fill="#ffffff"/>
                  <rect x="-40" y="-6" width="80" height="12" rx="6" fill="#ffffff"/>
                  <rect x="-28" y="-22" width="8" height="32" rx="4" fill="#ffffff"/>
                  <rect x="-10" y="-22" width="8" height="32" rx="4" fill="#ffffff"/>
                  <rect x="8" y="-22" width="8" height="32" rx="4" fill="#ffffff"/>
                  <rect x="26" y="-22" width="8" height="32" rx="4" fill="#ffffff"/>
                </g>
              </svg>
              Fantasy Check
            </h1>
            <p className="subtitle">Smart bot for Sleeper NFL Fantasy Football</p>
            <div className="status">✅ Bot is running on https://fantasy-check.vercel.app/</div>
            <br/>
            <a href="https://t.me/FantasyCheckBot" className="telegram-link" target="_blank" rel="noopener noreferrer">
              📱 Open in Telegram
            </a>
          </div>

          <div className="features">
            <div className="feature-card">
              <h3>🎯 Smart Notifications</h3>
              <p><strong>No spam!</strong> Get notifications only when needed:</p>
              <ul>
                <li><strong>Tuesday 6 PM</strong> - Waiver reminder</li>
                <li><strong>Wednesday 6 PM</strong> - Team check (injuries, byes)</li>
                <li><strong>Thursday-Monday 8 AM</strong> - Only if your players are playing</li>
              </ul>
            </div>

            <div className="feature-card">
              <h3>🏆 Draft Support</h3>
              <p>Full draft support:</p>
              <ul>
                <li><strong>1 hour before</strong> - Draft start notification</li>
                <li><strong>Your turn</strong> - Instant pick notifications</li>
                <li><strong>When adding leagues</strong> - Auto-detect scheduled drafts</li>
              </ul>
            </div>

            <div className="feature-card">
              <h3>⚡ Convenient Commands</h3>
              <div className="commands-grid">
                <div className="command">
                  <code>/start</code>
                  <div className="desc">Start using the bot</div>
                </div>
                <div className="command">
                  <code>/link_sleeper</code>
                  <div className="desc">Connect your Sleeper account</div>
                </div>
                <div className="command">
                  <code>/leagues</code>
                  <div className="desc">Manage leagues and alerts</div>
                </div>
                <div className="command">
                  <code>/today</code>
                  <div className="desc">Get today's digest</div>
                </div>
                <div className="command">
                  <code>/timezone</code>
                  <div className="desc">Change timezone</div>
                </div>
                <div className="command">
                  <code>/feedback</code>
                  <div className="desc">Send feedback to developers</div>
                </div>
              </div>
            </div>

            <div className="feature-card">
              <h3>🧠 Smart Analytics</h3>
              <ul>
                <li><strong>Real player names</strong> instead of IDs</li>
                <li><strong>Injury analysis</strong> and bye weeks</li>
                <li><strong>Single digest</strong> for all leagues</li>
                <li><strong>Timezone support</strong> - all messages in your time</li>
              </ul>
            </div>
          </div>

          <div className="feature-card" style={{textAlign: 'center'}}>
            <h3>🚀 How to start?</h3>
            <ol style={{textAlign: 'left', maxWidth: '400px', margin: '0 auto'}}>
              <li>Click the <strong>"Open in Telegram"</strong> button above</li>
              <li>Send <code>/start</code> to the bot</li>
              <li>Use <code>/link_sleeper your_username</code></li>
              <li>Done! Bot will start sending smart notifications</li>
            </ol>
            <p style={{marginTop: '20px', color: '#666'}}>
              👋 <strong>Hello SportHub friends!</strong><br/>
              New users get a special greeting
            </p>
          </div>
        </div>
      </div>

      <div className="footer">
        <p>Made with ❤️ for fantasy football enthusiasts</p>
        <p><small>Deployed on Vercel: {new Date().toLocaleString('uk-UA')}</small></p>
      </div>
    </>
  )
}