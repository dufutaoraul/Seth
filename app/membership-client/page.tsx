'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { toast } from 'react-hot-toast'
import { UserIcon } from '@heroicons/react/24/outline'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export default function MembershipClient() {
  const [user, setUser] = useState<any>(null)
  const [credits, setCredits] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push('/')
        return
      }

      setUser(user)
      await loadCredits(user.id)
    } catch (error) {
      console.error('认证检查失败:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const loadCredits = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/credits', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setCredits(data.credits)
      }
    } catch (error) {
      console.error('加载积分失败:', error)
    }
  }

  const handlePurchase = async (membershipType: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('请先登录')
        return
      }

      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          membershipType,
          paymentMethod: 'alipay', // 默认支付宝
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // 跳转到支付页面
        window.open(data.paymentUrl, '_blank')
        toast.success('支付订单已创建，请完成支付')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || '创建支付订单失败')
      }
    } catch (error) {
      console.error('创建支付订单失败:', error)
      toast.error('创建支付订单失败')
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-seth-gold">加载中...</div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-seth-dark to-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push('/chat-test')}
            className="text-seth-gold hover:text-yellow-300"
          >
            ← 返回聊天
          </button>
          <h1 className="text-3xl font-bold text-seth-gold">会员服务</h1>
          <div></div>
        </div>

        {/* 用户信息 */}
        <div className="bg-gray-900 rounded-lg p-6 mb-8">
          <div className="flex items-center space-x-4">
            <UserIcon className="w-12 h-12 text-seth-gold" />
            <div>
              <h2 className="text-xl font-bold">{user?.email}</h2>
              <p className="text-gray-400">
                当前积分: <span className="text-seth-gold">{credits?.remaining_credits || 0}</span>
              </p>
              <p className="text-gray-400">
                已使用: <span className="text-red-400">{credits?.used_credits || 0}</span>
              </p>
            </div>
          </div>
        </div>

        {/* 会员套餐 */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* 基础会员 */}
          <div className="bg-gray-900 rounded-lg p-6 border border-seth-gold">
            <h3 className="text-2xl font-bold text-seth-gold mb-4">基础会员</h3>
            <div className="text-3xl font-bold mb-2">¥145</div>
            <p className="text-gray-400 mb-6">150积分 + 更多功能</p>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                150积分对话
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                优先响应
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                历史记录保存
              </li>
            </ul>
            <button
              className="w-full bg-seth-gold hover:bg-yellow-600 text-black font-bold py-3 px-4 rounded transition-colors"
              onClick={() => handlePurchase('标准会员')}
            >
              立即购买
            </button>
          </div>

          {/* 高级会员 */}
          <div className="bg-gray-900 rounded-lg p-6 border border-seth-orange">
            <h3 className="text-2xl font-bold text-seth-orange mb-4">高级会员</h3>
            <div className="text-3xl font-bold mb-2">¥360</div>
            <p className="text-gray-400 mb-6">500积分 + 高级功能</p>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                500积分对话
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                最高优先级
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                无限历史记录
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                专属客服
              </li>
            </ul>
            <button
              className="w-full bg-seth-orange hover:bg-orange-600 text-white font-bold py-3 px-4 rounded transition-colors"
              onClick={() => handlePurchase('高级会员')}
            >
              立即购买
            </button>
          </div>
        </div>

        {/* 说明 */}
        <div className="mt-8 text-center text-gray-400">
          <p>购买会员后积分立即到账，支持微信、支付宝等多种支付方式</p>
          <p className="mt-2">如有问题请联系客服</p>
        </div>
      </div>
    </div>
  )
}