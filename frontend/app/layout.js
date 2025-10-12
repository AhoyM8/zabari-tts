import './globals.css'
import 'react-toastify/dist/ReactToastify.css'
import { ToastContainer } from 'react-toastify'

export const metadata = {
  title: 'Zabari TTS - Multi-Platform Chat Logger',
  description: 'Real-time text-to-speech for Twitch, YouTube, and Kick chats',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </body>
    </html>
  )
}
