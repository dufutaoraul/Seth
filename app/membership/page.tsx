'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import MembershipPage from '@/components/MembershipPage'
import type { User } from '@supabase/supabase-js'
import type { UserCredits, PaymentOrder } from '@/lib/supabase'

export default function Membership() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<PaymentOrder[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/')
          return
        }

        setUser(user)

        // 获取用户积分信息
        const { data: credits } = await supabase
          .from('user_credits')
          .select('*')
          .eq('user_id', user.id)
          .single()

        setUserCredits(credits)

        // 获取用户的支付记录
        const { data: history } = await supabase
          .from('payment_orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        setPaymentHistory(history || [])
      } catch (error) {
        console.error('加载会员信息失败:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-seth-dark flex items-center justify-center">
        <div className="text-seth-gold">加载中...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <MembershipPage
      user={user}
      userCredits={userCredits}
      paymentHistory={paymentHistory}
    />
  )
}