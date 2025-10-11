import './globals.css'

export const metadata = {
  title: 'Zabari TTS - Multi-Platform Chat Logger',
  description: 'Real-time text-to-speech for Twitch, YouTube, and Kick chats',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
