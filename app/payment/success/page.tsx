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
  const [orderType, setOrderType] = useState<string | null>(null) // 订单类型
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

        // ⭐ 处理ZPay的return_url回调参数
        const urlParams = new URLSearchParams(window.location.search)
        const out_trade_no = urlParams.get('out_trade_no')
        const trade_no = urlParams.get('trade_no')
        const trade_status = urlParams.get('trade_status')

        // 如果有回调参数，调用后端处理订单
        if (out_trade_no && trade_status === 'TRADE_SUCCESS') {
          console.log('检测到支付成功回调，处理订单:', out_trade_no)

          try {
            // 将所有URL参数传给后端notify API
            const params: Record<string, string> = {}
            urlParams.forEach((value, key) => {
              params[key] = value
            })

            // 调用notify API处理订单
            const notifyResponse = await fetch('/api/payment/notify?' + urlParams.toString(), {
              method: 'GET',
            })

            const notifyResult = await notifyResponse.text()
            console.log('订单处理结果:', notifyResult)

            if (notifyResult === 'success') {
              console.log('订单处理成功，等待2秒后刷新积分')
              // 等待2秒让数据库更新完成
              await new Promise(resolve => setTimeout(resolve, 2000))
            }
          } catch (notifyError) {
            console.error('处理订单回调失败:', notifyError)
          }
        }

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

        // 获取最新的订单信息，判断购买类型
        if (out_trade_no) {
          const { data: order, error: orderError } = await supabase
            .from('payment_orders')
            .select('order_type, membership_type, credits_to_add')
            .eq('order_no', out_trade_no)
            .single()

          if (!orderError && order) {
            console.log('订单信息:', order)
            setOrderType(order.order_type)
          }
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

  return <PaymentSuccessPage user={user} userCredits={userCredits} orderType={orderType} />
}