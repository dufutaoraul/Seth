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
        // 先尝试从Session恢复
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (session?.user) {
          console.log('从Session恢复用户信息成功')
          setUser(session.user)
        } else {
          // Session不存在，尝试刷新
          console.log('Session不存在，尝试刷新...')
          const { data: { user }, error } = await supabase.auth.getUser()

          if (error || !user) {
            console.log('用户Session丢失，尝试从支付回调中恢复用户信息')

            // 不要直接跳转，而是设置loading=false，让用户看到支付成功页面
            // 用户可以点击"开始对话"按钮，会自动引导到登录页面
            setLoading(false)
            return
          }

          setUser(user)
        }

        // ⭐ 处理ZPay的return_url回调参数
        const urlParams = new URLSearchParams(window.location.search)
        const out_trade_no = urlParams.get('out_trade_no')
        const trade_no = urlParams.get('trade_no')
        const trade_status = urlParams.get('trade_status')

        // ⭐ 如果有回调参数，强制处理订单（包含重试机制）
        if (out_trade_no && trade_status === 'TRADE_SUCCESS') {
          console.log('检测到支付成功回调，处理订单:', out_trade_no)

          // 重试机制：最多尝试3次
          let retryCount = 0
          let success = false

          while (retryCount < 3 && !success) {
            try {
              retryCount++
              console.log(`第${retryCount}次尝试处理订单...`)

              // 调用notify API处理订单
              const notifyResponse = await fetch('/api/payment/notify?' + urlParams.toString(), {
                method: 'GET',
              })

              const notifyResult = await notifyResponse.text()
              console.log('订单处理结果:', notifyResult)

              if (notifyResult === 'success') {
                success = true
                console.log('订单处理成功！')
                // 等待2秒让数据库更新完成
                await new Promise(resolve => setTimeout(resolve, 2000))
              } else {
                console.warn('订单处理返回非success结果，准备重试...')
                await new Promise(resolve => setTimeout(resolve, 1000))
              }
            } catch (notifyError) {
              console.error(`第${retryCount}次尝试失败:`, notifyError)
              if (retryCount < 3) {
                await new Promise(resolve => setTimeout(resolve, 1000))
              }
            }
          }

          if (!success) {
            console.error('订单处理失败，已尝试3次')
            // 即使失败也继续加载页面，用户可以联系客服手动处理
          }
        }

        // 只有在user存在时才获取积分信息
        if (user) {
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
        <div className="text-center">
          <div className="text-seth-gold text-xl mb-4">正在处理订单...</div>
          <div className="text-gray-400 text-sm">请稍候，不要关闭此页面</div>
          <div className="mt-4">
            <div className="w-16 h-16 border-4 border-seth-gold border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  // 如果用户Session丢失，显示简化版的支付成功页面，引导用户重新登录
  if (!user) {
    return (
      <div className="min-h-screen bg-seth-dark flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-700 text-center">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-seth-gold mb-4">支付成功！</h1>
          <p className="text-gray-300 mb-6">您的支付已成功处理，积分已到账</p>
          <p className="text-gray-400 text-sm mb-8">请重新登录以继续使用</p>
          <button
            onClick={() => router.push('/')}
            className="w-full btn-primary"
          >
            返回首页并登录
          </button>
        </div>
      </div>
    )
  }

  return <PaymentSuccessPage user={user} userCredits={userCredits} orderType={orderType} />
}