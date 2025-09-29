import './globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import StarryBackground from '@/components/StarryBackground'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: '与赛斯对话 - AI智慧聊天',
  description: '探索意识的本质，现实和存在的深层奥秘',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <StarryBackground />
        <div className="gradient-overlay min-h-screen">
          {children}
        </div>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#374151',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  )
}