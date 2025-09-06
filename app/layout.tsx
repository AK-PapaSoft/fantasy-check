import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fantasy Check - Sleeper NFL Bot 🏈',
  description: 'Розумний бот для Sleeper NFL Fantasy футболу',
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' role='img' aria-label='Fantasy bot logo: chat bubble + football' width='512' height='512'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%2316a34a'/%3E%3Cstop offset='100%25' stop-color='%230ea5e9'/%3E%3C/linearGradient%3E%3Cfilter id='s' x='-20%25' y='-20%25' width='140%25' height='140%25'%3E%3CfeDropShadow dx='0' dy='6' stdDeviation='12' flood-opacity='0.18'/%3E%3C/filter%3E%3C/defs%3E%3Ccircle cx='256' cy='256' r='224' fill='url(%23g)' /%3E%3Cg filter='url(%23s)'%3E%3Cpath d='M356 172c-22-22-53-34-100-34s-78 12-100 34c-22 22-34 53-34 100s12 78 34 100c22 22 53 34 100 34h14c13 0 24 11 24 24v24l46-34c8-6 13-15 13-25v-3c29-19 43-53 43-100 0-47-12-78-34-100z' fill='%23ffffff'/%3E%3C/g%3E%3Cg transform='translate(256 256) rotate(-18)'%3E%3Cellipse cx='0' cy='0' rx='120' ry='72' fill='%237c3f11'/%3E%3Crect x='-110' y='-10' width='28' height='20' rx='10' fill='%23ffffff'/%3E%3Crect x='82' y='-10' width='28' height='20' rx='10' fill='%23ffffff'/%3E%3Crect x='-40' y='-6' width='80' height='12' rx='6' fill='%23ffffff'/%3E%3Crect x='-28' y='-22' width='8' height='32' rx='4' fill='%23ffffff'/%3E%3Crect x='-10' y='-22' width='8' height='32' rx='4' fill='%23ffffff'/%3E%3Crect x='8' y='-22' width='8' height='32' rx='4' fill='%23ffffff'/%3E%3Crect x='26' y='-22' width='8' height='32' rx='4' fill='%23ffffff'/%3E%3C/g%3E%3C/svg%3E"
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  )
}