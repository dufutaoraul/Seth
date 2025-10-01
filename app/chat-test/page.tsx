'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import ChatInterface from '@/components/ChatInterface'

export default function ChatTestPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // 获取当前用户
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      console.log('Client-side user check:', user ? 'Found' : 'Not found', error ? error.message : '')

      if (user) {
        setUser(user)
      } else {
        console.log('No user found, redirecting to home')
        router.push('/')
      }
      setLoading(false)
    }

    getUser()

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user ? 'User found' : 'No user')
      if (session?.user) {
        setUser(session.user)
      } else if (event === 'SIGNED_OUT') {
        // 退出登录时立即跳转，不显示"未找到用户信息"界面
        window.location.href = '/'
      } else {
        setUser(null)
        router.push('/')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-seth-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-seth-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-seth-gold">正在验证登录状态...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-seth-dark flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">未找到用户信息</p>
          <button
            onClick={() => router.push('/')}
            className="btn-primary"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  // 创建默认的用户积分信息
  const defaultCredits = {
    id: 'temp',
    user_id: user.id,
    total_credits: 15,
    used_credits: 0,
    remaining_credits: 15,
    current_membership: '免费用户',
    membership_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return (
    <ChatInterface
      user={user}
      userCredits={defaultCredits}
      sessions={[]}
    />
  )
}