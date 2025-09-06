import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Simple health check that doesn't depend on database
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    message: 'Sleeper NFL Bot is running'
  });
});

// Root endpoint - Ukrainian homepage with English toggle
router.get('/', (req: Request, res: Response) => {
  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="uk">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fantasy Gather - Sleeper NFL Bot 🏈</title>
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' role='img' aria-label='Fantasy bot logo: chat bubble + football' width='512' height='512'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%2316a34a'/%3E%3Cstop offset='100%25' stop-color='%230ea5e9'/%3E%3C/linearGradient%3E%3Cfilter id='s' x='-20%25' y='-20%25' width='140%25' height='140%25'%3E%3CfeDropShadow dx='0' dy='6' stdDeviation='12' flood-opacity='0.18'/%3E%3C/filter%3E%3C/defs%3E%3Ccircle cx='256' cy='256' r='224' fill='url(%23g)' /%3E%3Cg filter='url(%23s)'%3E%3Cpath d='M356 172c-22-22-53-34-100-34s-78 12-100 34c-22 22-34 53-34 100s12 78 34 100c22 22 53 34 100 34h14c13 0 24 11 24 24v24l46-34c8-6 13-15 13-25v-3c29-19 43-53 43-100 0-47-12-78-34-100z' fill='%23ffffff'/%3E%3C/g%3E%3Cg transform='translate(256 256) rotate(-18)'%3E%3Cellipse cx='0' cy='0' rx='120' ry='72' fill='%237c3f11'/%3E%3Crect x='-110' y='-10' width='28' height='20' rx='10' fill='%23ffffff'/%3E%3Crect x='82' y='-10' width='28' height='20' rx='10' fill='%23ffffff'/%3E%3Crect x='-40' y='-6' width='80' height='12' rx='6' fill='%23ffffff'/%3E%3Crect x='-28' y='-22' width='8' height='32' rx='4' fill='%23ffffff'/%3E%3Crect x='-10' y='-22' width='8' height='32' rx='4' fill='%23ffffff'/%3E%3Crect x='8' y='-22' width='8' height='32' rx='4' fill='%23ffffff'/%3E%3Crect x='26' y='-22' width='8' height='32' rx='4' fill='%23ffffff'/%3E%3C/g%3E%3C/svg%3E">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                color: #333;
                line-height: 1.6;
            }
            
            .lang-toggle {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                background: rgba(255,255,255,0.9);
                border-radius: 25px;
                padding: 8px 16px;
                border: none;
                cursor: pointer;
                font-weight: bold;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                transition: all 0.3s ease;
            }
            
            .lang-toggle:hover {
                background: white;
                transform: translateY(-2px);
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            }
            
            .container { 
                max-width: 900px; 
                margin: 0 auto; 
                padding: 40px 20px;
            }
            
            .hero {
                text-align: center;
                background: rgba(255,255,255,0.95);
                padding: 60px 40px;
                border-radius: 20px;
                margin-bottom: 40px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            }
            
            .hero h1 {
                font-size: 3.5em;
                margin-bottom: 20px;
                background: linear-gradient(45deg, #667eea, #764ba2);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 20px;
            }
            
            .logo {
                width: 80px;
                height: 80px;
                flex-shrink: 0;
            }
            
            .hero .subtitle {
                font-size: 1.3em;
                color: #666;
                margin-bottom: 30px;
            }
            
            .status { 
                display: inline-block;
                background: #28a745;
                color: white;
                padding: 12px 24px;
                border-radius: 25px;
                font-weight: bold;
                margin: 20px 0;
            }
            
            .features {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 30px;
                margin: 40px 0;
            }
            
            .feature-card {
                background: rgba(255,255,255,0.95);
                padding: 30px;
                border-radius: 15px;
                box-shadow: 0 5px 25px rgba(0,0,0,0.1);
                transition: transform 0.3s ease;
            }
            
            .feature-card:hover {
                transform: translateY(-5px);
            }
            
            .feature-card h3 {
                font-size: 1.5em;
                margin-bottom: 15px;
                color: #333;
            }
            
            .commands-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 15px;
                margin: 20px 0;
            }
            
            .command {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 10px;
                border-left: 4px solid #667eea;
            }
            
            .command code {
                font-weight: bold;
                color: #667eea;
                font-size: 1.1em;
            }
            
            .command .desc {
                margin-top: 5px;
                color: #666;
                font-size: 0.9em;
            }
            
            .telegram-link {
                display: inline-block;
                background: linear-gradient(45deg, #0088cc, #0066aa);
                color: white;
                padding: 15px 30px;
                border-radius: 25px;
                text-decoration: none;
                font-weight: bold;
                font-size: 1.2em;
                margin: 20px 10px;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(0,136,204,0.3);
            }
            
            .telegram-link:hover {
                transform: translateY(-3px);
                box-shadow: 0 8px 25px rgba(0,136,204,0.4);
            }
            
            .footer {
                text-align: center;
                padding: 40px;
                color: rgba(255,255,255,0.8);
            }
            
            .hidden { display: none; }
            
            @media (max-width: 768px) {
                .hero h1 { 
                    font-size: 2.5em; 
                    flex-direction: column;
                    gap: 15px;
                }
                .hero { padding: 40px 20px; }
                .container { padding: 20px 10px; }
                .logo { 
                    width: 64px; 
                    height: 64px; 
                }
            }
        </style>
    </head>
    <body>
        <button class="lang-toggle" onclick="toggleLanguage()">
            <span id="lang-switch-en" class="hidden">🇺🇸 ENG</span>
            <span id="lang-switch-uk">🇺🇦 УКР</span>
        </button>

        <div class="container">
            <!-- Ukrainian Version -->
            <div id="content-uk">
                <div class="hero">
                    <h1>
                        <svg class="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Fantasy bot logo">
                            <defs>
                                <linearGradient id="g-uk" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stop-color="#16a34a"/>
                                    <stop offset="100%" stop-color="#0ea5e9"/>
                                </linearGradient>
                                <filter id="s-uk" x="-20%" y="-20%" width="140%" height="140%">
                                    <feDropShadow dx="0" dy="6" stdDeviation="12" flood-opacity="0.18"/>
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
                        Fantasy Gather
                    </h1>
                    <p class="subtitle">Розумний бот для Sleeper NFL Fantasy футболу</p>
                    <div class="status">✅ Бот працює!</div>
                    <br>
                    <a href="https://t.me/FantasyGatherBot" class="telegram-link" target="_blank">
                        📱 Відкрити в Telegram
                    </a>
                </div>

                <div class="features">
                    <div class="feature-card">
                        <h3>🎯 Розумні сповіщення</h3>
                        <p><strong>Без спаму!</strong> Отримуй повідомлення лише коли потрібно:</p>
                        <ul>
                            <li><strong>Вівторок 18:00</strong> - Нагадування про waivers</li>
                            <li><strong>Середа 18:00</strong> - Перевірка команди (травми, пропуски)</li>
                            <li><strong>Четвер-Понеділок 8:00</strong> - Тільки якщо твої гравці грають</li>
                        </ul>
                    </div>

                    <div class="feature-card">
                        <h3>🏆 Драфт підтримка</h3>
                        <p>Повна підтримка драфтів:</p>
                        <ul>
                            <li><strong>За 1 годину</strong> - Сповіщення про початок</li>
                            <li><strong>Твоя черга</strong> - Миттєві повідомлення</li>
                            <li><strong>При додаванні ліг</strong> - Автоматичне виявлення запланованих драфтів</li>
                        </ul>
                    </div>

                    <div class="feature-card">
                        <h3>⚡ Зручні команди</h3>
                        <div class="commands-grid">
                            <div class="command">
                                <code>/start</code>
                                <div class="desc">Почати роботу з ботом</div>
                            </div>
                            <div class="command">
                                <code>/link_sleeper</code>
                                <div class="desc">Підключити свій Sleeper акаунт</div>
                            </div>
                            <div class="command">
                                <code>/leagues</code>
                                <div class="desc">Управління лігами та алертами</div>
                            </div>
                            <div class="command">
                                <code>/today</code>
                                <div class="desc">Отримати дайджест на сьогодні</div>
                            </div>
                            <div class="command">
                                <code>/timezone</code>
                                <div class="desc">Змінити часовий пояс</div>
                            </div>
                            <div class="command">
                                <code>/feedback</code>
                                <div class="desc">Надіслати відгук розробникам</div>
                            </div>
                        </div>
                    </div>

                    <div class="feature-card">
                        <h3>🧠 Розумна аналітика</h3>
                        <ul>
                            <li><strong>Реальні імена гравців</strong> замість ID</li>
                            <li><strong>Аналіз травм</strong> та пропусків команд</li>
                            <li><strong>Один дайджест</strong> для всіх ліг</li>
                            <li><strong>Часові пояси</strong> - всі повідомлення у вашому часі</li>
                        </ul>
                    </div>
                </div>

                <div class="feature-card" style="text-align: center;">
                    <h3>🚀 Як почати?</h3>
                    <ol style="text-align: left; max-width: 400px; margin: 0 auto;">
                        <li>Натисни кнопку <strong>"Відкрити в Telegram"</strong> вище</li>
                        <li>Надішли боту <code>/start</code></li>
                        <li>Використай <code>/link_sleeper твій_нікнейм</code></li>
                        <li>Готово! Бот почне надсилати розумні сповіщення</li>
                    </ol>
                    <p style="margin-top: 20px; color: #666;">
                        👋 <strong>Привіт друзям зі SportHub!</strong><br>
                        Нові користувачі отримують спеціальне вітання
                    </p>
                </div>
            </div>

            <!-- English Version -->
            <div id="content-en" class="hidden">
                <div class="hero">
                    <h1>
                        <svg class="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Fantasy bot logo">
                            <defs>
                                <linearGradient id="g-en" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stop-color="#16a34a"/>
                                    <stop offset="100%" stop-color="#0ea5e9"/>
                                </linearGradient>
                                <filter id="s-en" x="-20%" y="-20%" width="140%" height="140%">
                                    <feDropShadow dx="0" dy="6" stdDeviation="12" flood-opacity="0.18"/>
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
                        Fantasy Gather
                    </h1>
                    <p class="subtitle">Smart bot for Sleeper NFL Fantasy Football</p>
                    <div class="status">✅ Bot is running!</div>
                    <br>
                    <a href="https://t.me/FantasyGatherBot" class="telegram-link" target="_blank">
                        📱 Open in Telegram
                    </a>
                </div>

                <div class="features">
                    <div class="feature-card">
                        <h3>🎯 Smart Notifications</h3>
                        <p><strong>No spam!</strong> Get notifications only when needed:</p>
                        <ul>
                            <li><strong>Tuesday 6 PM</strong> - Waiver reminder</li>
                            <li><strong>Wednesday 6 PM</strong> - Team check (injuries, byes)</li>
                            <li><strong>Thursday-Monday 8 AM</strong> - Only if your players are playing</li>
                        </ul>
                    </div>

                    <div class="feature-card">
                        <h3>🏆 Draft Support</h3>
                        <p>Full draft support:</p>
                        <ul>
                            <li><strong>1 hour before</strong> - Draft start notification</li>
                            <li><strong>Your turn</strong> - Instant pick notifications</li>
                            <li><strong>When adding leagues</strong> - Auto-detect scheduled drafts</li>
                        </ul>
                    </div>

                    <div class="feature-card">
                        <h3>⚡ Convenient Commands</h3>
                        <div class="commands-grid">
                            <div class="command">
                                <code>/start</code>
                                <div class="desc">Start using the bot</div>
                            </div>
                            <div class="command">
                                <code>/link_sleeper</code>
                                <div class="desc">Connect your Sleeper account</div>
                            </div>
                            <div class="command">
                                <code>/leagues</code>
                                <div class="desc">Manage leagues and alerts</div>
                            </div>
                            <div class="command">
                                <code>/today</code>
                                <div class="desc">Get today's digest</div>
                            </div>
                            <div class="command">
                                <code>/timezone</code>
                                <div class="desc">Change timezone</div>
                            </div>
                            <div class="command">
                                <code>/feedback</code>
                                <div class="desc">Send feedback to developers</div>
                            </div>
                        </div>
                    </div>

                    <div class="feature-card">
                        <h3>🧠 Smart Analytics</h3>
                        <ul>
                            <li><strong>Real player names</strong> instead of IDs</li>
                            <li><strong>Injury analysis</strong> and bye weeks</li>
                            <li><strong>Single digest</strong> for all leagues</li>
                            <li><strong>Timezone support</strong> - all messages in your time</li>
                        </ul>
                    </div>
                </div>

                <div class="feature-card" style="text-align: center;">
                    <h3>🚀 How to start?</h3>
                    <ol style="text-align: left; max-width: 400px; margin: 0 auto;">
                        <li>Click the <strong>"Open in Telegram"</strong> button above</li>
                        <li>Send <code>/start</code> to the bot</li>
                        <li>Use <code>/link_sleeper your_username</code></li>
                        <li>Done! Bot will start sending smart notifications</li>
                    </ol>
                    <p style="margin-top: 20px; color: #666;">
                        👋 <strong>Hello SportHub friends!</strong><br>
                        New users get a special greeting
                    </p>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Made with ❤️ for fantasy football enthusiasts</p>
            <p><small>Last deployed: ${new Date().toLocaleString('uk-UA')}</small></p>
        </div>

        <script>
            let currentLang = 'uk';
            
            function toggleLanguage() {
                if (currentLang === 'uk') {
                    // Switch to English
                    document.getElementById('content-uk').classList.add('hidden');
                    document.getElementById('content-en').classList.remove('hidden');
                    document.getElementById('lang-switch-uk').classList.add('hidden');
                    document.getElementById('lang-switch-en').classList.remove('hidden');
                    document.documentElement.lang = 'en';
                    currentLang = 'en';
                } else {
                    // Switch to Ukrainian
                    document.getElementById('content-en').classList.add('hidden');
                    document.getElementById('content-uk').classList.remove('hidden');
                    document.getElementById('lang-switch-en').classList.add('hidden');
                    document.getElementById('lang-switch-uk').classList.remove('hidden');
                    document.documentElement.lang = 'uk';
                    currentLang = 'uk';
                }
            }
            
            // Add some loading animation
            document.addEventListener('DOMContentLoaded', function() {
                document.body.style.opacity = '0';
                setTimeout(() => {
                    document.body.style.transition = 'opacity 0.5s ease-in';
                    document.body.style.opacity = '1';
                }, 100);
            });
        </script>
    </body>
    </html>
  `);
});

export { router as simpleHealthRouter };