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

      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000
      }}>
        <a 
          href="https://buymeacoffee.com/cleareds" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '8px 16px',
            backgroundColor: '#FFDD00',
            color: '#000',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          ☕ Buy me a coffee
        </a>
      </div>

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
            <a href="https://t.me/FantasyGatherbot" className="telegram-link" target="_blank" rel="noopener noreferrer">
              📱 Відкрити в Telegram
            </a>
          </div>

          <div className="features">
            <div className="feature-card">
              <h3>🤖 Розумні сповіщення з AI</h3>
              <p><strong>Персоналізовані повідомлення</strong> з аналізом ваших команд:</p>
              <ul>
                <li><strong>Понеділок 12:00</strong> - Поточний стан матчапів та прогрес тижня</li>
                <li><strong>Понеділок 21:00</strong> - Вейвер алерти перед дедлайном</li>
                <li><strong>Вівторок 09:00</strong> - Аналіз команд та підготовка до тижня</li>
                <li><strong>Вівторок 10:00</strong> - Додаткові вейвер алерти з AI рекомендаціями</li>
                <li><strong>Четвер + П'ятниця 18:00</strong> - Попередній огляд тижня NFL</li>
              </ul>
            </div>

            <div className="feature-card">
              <h3>🎯 Pick'em та Fantasy ліги</h3>
              <p>Підтримка всіх типів ліг Sleeper:</p>
              <ul>
                <li><strong>Fantasy ліги</strong> - Живі результати з ймовірністю перемоги</li>
                <li><strong>Pick'em ліги</strong> - Відстеження точності та дедлайнів</li>
                <li><strong>Dynasty/Redraft</strong> - Автоматичне розпізнавання типу</li>
                <li><strong>Позиція в лізі</strong> - Реальні standings та playoff статус</li>
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
                  <div className="desc">Всі ліги: позиція, плейоф, наступний матчап</div>
                </div>
                <div className="command">
                  <code>/today</code>
                  <div className="desc">Живі результати з ймовірністю перемоги</div>
                </div>
                <div className="command">
                  <code>/waivers</code>
                  <div className="desc">AI рекомендації по вейверам</div>
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
              <h3>🧠 AI аналітика та рекомендації</h3>
              <ul>
                <li><strong>Персональні поради</strong> - AI аналізує ваші ростери</li>
                <li><strong>Трендові підписання</strong> - Roschon Johnson, Jaylen Wright</li>
                <li><strong>Позиційні потреби</strong> - RB/WR нестача по командах</li>
                <li><strong>Matchup аналіз</strong> - Захисти проти слабких нападів</li>
                <li><strong>Pick'em статистика</strong> - Точність прогнозів за сезон</li>
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
            <a href="https://t.me/FantasyGatherbot" className="telegram-link" target="_blank" rel="noopener noreferrer">
              📱 Open in Telegram
            </a>
          </div>

          <div className="features">
            <div className="feature-card">
              <h3>🤖 Smart AI Notifications</h3>
              <p><strong>Personalized messages</strong> with team analysis:</p>
              <ul>
                <li><strong>Monday 12 PM</strong> - Current matchup status and week progress</li>
                <li><strong>Monday 9 PM</strong> - Waiver alerts before deadline</li>
                <li><strong>Tuesday 9 AM</strong> - Team analysis and week preparation</li>
                <li><strong>Tuesday 10 AM</strong> - Additional waiver alerts with AI recommendations</li>
                <li><strong>Thursday + Friday 6 PM</strong> - NFL week preview</li>
              </ul>
            </div>

            <div className="feature-card">
              <h3>🎯 Pick'em and Fantasy Leagues</h3>
              <p>Support for all Sleeper league types:</p>
              <ul>
                <li><strong>Fantasy leagues</strong> - Live results with win probability</li>
                <li><strong>Pick'em leagues</strong> - Accuracy tracking and deadlines</li>
                <li><strong>Dynasty/Redraft</strong> - Automatic type recognition</li>
                <li><strong>League standings</strong> - Real standings and playoff status</li>
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
                  <div className="desc">All leagues: position, playoffs, next matchup</div>
                </div>
                <div className="command">
                  <code>/today</code>
                  <div className="desc">Live results with win probability</div>
                </div>
                <div className="command">
                  <code>/waivers</code>
                  <div className="desc">AI waiver recommendations</div>
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
              <h3>🧠 AI Analytics and Recommendations</h3>
              <ul>
                <li><strong>Personal advice</strong> - AI analyzes your rosters</li>
                <li><strong>Trending pickups</strong> - Roschon Johnson, Jaylen Wright</li>
                <li><strong>Position needs</strong> - RB/WR shortages by team</li>
                <li><strong>Matchup analysis</strong> - Defenses vs weak offenses</li>
                <li><strong>Pick'em statistics</strong> - Season accuracy tracking</li>
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