export default function Home() {
  return (
    <div>
      <h1>🏈 Fantasy Check Bot</h1>
      <p>Bot працює на https://fantasy-check.vercel.app/</p>
      <p>Timestamp: {new Date().toISOString()}</p>
      <a href="https://t.me/FantasyCheckBot">📱 Відкрити в Telegram</a>
    </div>
  )
}