'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { UserCredits, PaymentOrder, supabase } from '@/lib/supabase'
import { MEMBERSHIP_PLANS, MembershipType } from '@/lib/zpay'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Crown,
  Star,
  Zap,
  CreditCard,
  Clock,
  Check,
  History,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  user: User
  userCredits: UserCredits | null
  paymentHistory: PaymentOrder[]
}

export default function MembershipPage({ user, userCredits, paymentHistory }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [showPaymentHistory, setShowPaymentHistory] = useState(false)
  const router = useRouter()

  const handlePurchase = async (membershipType: MembershipType) => {
    if (membershipType === '普通会员') return

    setLoading(membershipType)

    try {
      // 获取用户token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('请先登录')
        router.push('/')
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

      if (!response.ok) {
        throw new Error('创建订单失败')
      }

      const { paymentUrl } = await response.json()

      // 跳转到支付页面
      window.open(paymentUrl, '_blank')
      toast.success('已打开支付页面，请完成支付')
    } catch (error: any) {
      toast.error(error.message || '创建订单失败')
    } finally {
      setLoading(null)
    }
  }

  const getMembershipIcon = (type: MembershipType) => {
    switch (type) {
      case '普通会员':
        return <Star className="w-8 h-8" />
      case '标准会员':
        return <Zap className="w-8 h-8" />
      case '高级会员':
        return <Crown className="w-8 h-8" />
      default:
        return <Star className="w-8 h-8" />
    }
  }

  const getMembershipColor = (type: MembershipType) => {
    switch (type) {
      case '普通会员':
        return 'border-gray-600 bg-gray-800/50'
      case '标准会员':
        return 'border-seth-orange bg-orange-900/20'
      case '高级会员':
        return 'border-seth-gold bg-yellow-900/20 ring-2 ring-seth-gold'
      default:
        return 'border-gray-600 bg-gray-800/50'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-400'
      case 'pending':
        return 'text-yellow-400'
      case 'failed':
        return 'text-red-400'
      case 'cancelled':
        return 'text-gray-400'
      default:
        return 'text-gray-400'
    }
  }

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return '已支付'
      case 'pending':
        return '待支付'
      case 'failed':
        return '支付失败'
      case 'cancelled':
        return '已取消'
      default:
        return '未知'
    }
  }

  return (
    <div className="min-h-screen bg-seth-dark">
      {/* 顶部导航 */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white mr-4"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-seth-gold">会员中心</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 当前状态 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-gray-700"
        >
          <h2 className="text-xl font-bold mb-4">当前状态</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-seth-gold mb-2">
                {userCredits?.remaining_credits || 0}
              </div>
              <div className="text-gray-400">剩余积分</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-seth-orange mb-2">
                {userCredits?.current_membership || '普通会员'}
              </div>
              <div className="text-gray-400">当前等级</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-300 mb-2">
                {userCredits?.membership_expires_at
                  ? new Date(userCredits.membership_expires_at).toLocaleDateString()
                  : '永久'}
              </div>
              <div className="text-gray-400">到期时间</div>
            </div>
          </div>
        </motion.div>

        {/* 会员套餐 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold mb-6 text-center">选择会员等级</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {Object.entries(MEMBERSHIP_PLANS).map(([type, plan]) => {
              const membershipType = type as MembershipType
              const isCurrent = userCredits?.current_membership === type
              const isPopular = type === '高级会员'

              return (
                <motion.div
                  key={type}
                  whileHover={{ scale: 1.02 }}
                  className={`relative rounded-2xl p-6 border-2 transition-all ${getMembershipColor(
                    membershipType
                  )}`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-seth-gold text-seth-dark px-4 py-1 rounded-full text-sm font-bold">
                        最受欢迎
                      </span>
                    </div>
                  )}

                  <div className="text-center">
                    <div className="flex justify-center mb-4 text-seth-gold">
                      {getMembershipIcon(membershipType)}
                    </div>

                    <h3 className="text-xl font-bold mb-2">{type}</h3>

                    {/* 普通会员显示 ¥0 / 15积分 格式 */}
                    {type === '普通会员' ? (
                      <div className="text-2xl font-bold text-seth-gold mb-4">
                        ¥{plan.price} / {plan.credits}积分
                      </div>
                    ) : (
                      <>
                        <div className="text-3xl font-bold mb-4">
                          {plan.credits}
                          <span className="text-lg text-gray-400">次对话</span>
                        </div>
                        {plan.price > 0 && (
                          <div className="text-2xl font-bold text-seth-gold mb-4">
                            ¥{plan.price}
                            <span className="text-sm text-gray-400">/月</span>
                          </div>
                        )}
                      </>
                    )}

                    {isCurrent ? (
                      <div className="w-full py-3 bg-gray-600 text-gray-300 rounded-full font-semibold">
                        当前套餐
                      </div>
                    ) : plan.price === 0 ? (
                      <div className="w-full py-3 bg-gray-600 text-gray-300 rounded-full font-semibold">
                        当前套餐
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePurchase(membershipType)}
                        disabled={loading === membershipType}
                        className={`w-full py-3 rounded-full font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          isPopular ? 'btn-primary' : 'btn-secondary'
                        }`}
                      >
                        {loading === membershipType ? (
                          <div className="flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                            创建订单中...
                          </div>
                        ) : (
                          `立即购买`
                        )}
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* 查询订单按钮 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <button
            onClick={() => setShowPaymentHistory(!showPaymentHistory)}
            className="w-full md:w-auto bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center mx-auto"
          >
            <History className="w-5 h-5 mr-2" />
            {showPaymentHistory ? '隐藏订单记录' : '查询订单记录'}
          </button>
        </motion.div>

        {/* 支付历史 - 点击后才显示，且只显示已支付的 */}
        {showPaymentHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 mb-8"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <History className="w-6 h-6 mr-2" />
              订单记录
            </h2>
            {paymentHistory.filter(order => order.payment_status === 'paid').length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="text-left py-3">订单号</th>
                      <th className="text-left py-3">套餐</th>
                      <th className="text-left py-3">金额</th>
                      <th className="text-left py-3">状态</th>
                      <th className="text-left py-3">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory
                      .filter(order => order.payment_status === 'paid')
                      .map((order) => (
                        <tr key={order.id} className="border-b border-gray-700">
                          <td className="py-3 font-mono text-xs">{order.order_no}</td>
                          <td className="py-3">{order.membership_type}</td>
                          <td className="py-3 text-seth-gold">¥{order.amount_yuan}</td>
                          <td className={`py-3 ${getPaymentStatusColor(order.payment_status)}`}>
                            {getPaymentStatusText(order.payment_status)}
                          </td>
                          <td className="py-3 text-gray-400">
                            {new Date(order.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>暂无已支付的订单记录</p>
              </div>
            )}
          </motion.div>
        )}

        {/* 帮助信息 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 bg-gray-800/30 rounded-xl p-6 border border-gray-700"
        >
          <h3 className="text-lg font-semibold mb-4">购买说明</h3>
          <div className="space-y-2 text-sm text-gray-400">
            <p>• 会员有效期为购买后的30天</p>
            <p>• 积分每月自动重置，未使用积分不会累积</p>
            <p>• 目前只支持支付宝支付，请用支付宝扫码支付</p>
            <p>• 购买后即时生效，积分立即到账</p>
            <p>• 如有问题请联系客服微信：15692903143</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}