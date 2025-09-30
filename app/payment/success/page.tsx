'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { UserCredits } from '@/lib/supabase'
import PaymentSuccessPage from '@/components/PaymentSuccessPage'

export default function PaymentSuccess() {
  const [user, setUser] = useState<User | null>(null)
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkUserAndLoadCredits = async () => {
      try {
        // 检查用户认证状态
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
          console.log('用户未认证，跳转到首页')
          router.push('/')
          return
        }

        setUser(user)

        // 获取最新的积分信息
        const { data: userCredits, error: creditsError } = await supabase
          .from('user_credits')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (creditsError) {
          console.error('获取积分信息失败:', creditsError)
        } else {
          console.log('支付成功页面获取到的用户积分:', userCredits)
          setUserCredits(userCredits)
        }
      } catch (error) {
        console.error('检查用户状态失败:', error)
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    checkUserAndLoadCredits()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-seth-dark flex items-center justify-center">
        <div className="text-seth-gold text-xl">加载中...</div>
      </div>
    )
  }

  if (!user) {
    return null // 将会重定向到首页
  }

  return <PaymentSuccessPage user={user} userCredits={userCredits} />
}