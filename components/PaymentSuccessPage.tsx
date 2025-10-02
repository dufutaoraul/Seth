'use client'

import { User } from '@supabase/supabase-js'
import { UserCredits } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle, Sparkles, ArrowRight } from 'lucide-react'

interface Props {
  user: User
  userCredits: UserCredits | null
  orderType: string | null
}

export default function PaymentSuccessPage({ user, userCredits, orderType }: Props) {
  const router = useRouter()

  // 根据订单类型生成提示文案
  const getSuccessMessage = () => {
    if (orderType === 'credit_pack') {
      return '积分充值成功！'
    } else if (orderType === 'upgrade') {
      return `恭喜您成功升级为 ${userCredits?.current_membership}！`
    } else if (orderType === 'membership') {
      return `恭喜您成功开通 ${userCredits?.current_membership}！`
    } else {
      // 默认文案
      return '支付成功！'
    }
  }

  return (
    <div className="min-h-screen bg-seth-dark flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        {/* 成功图标 */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mb-8"
        >
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <div className="text-6xl mb-4">🎉</div>
        </motion.div>

        {/* 成功信息 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 mb-8"
        >
          <h1 className="text-3xl font-bold text-seth-gold mb-4">{getSuccessMessage()}</h1>
          {orderType !== 'credit_pack' && (
            <p className="text-gray-300 mb-6">
              现在您已是 <span className="text-seth-orange font-semibold">{userCredits?.current_membership}</span>
            </p>
          )}

          {/* 权益信息 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
              <span className="text-gray-400">当前积分</span>
              <span className="text-seth-gold font-bold text-xl">
                {userCredits?.remaining_credits || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
              <span className="text-gray-400">会员等级</span>
              <span className="text-seth-orange font-semibold">
                {userCredits?.current_membership}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
              <span className="text-gray-400">到期时间</span>
              <span className="text-gray-300">
                {userCredits?.membership_expires_at
                  ? new Date(userCredits.membership_expires_at).toLocaleDateString()
                  : '永久'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* 操作按钮 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <button
            onClick={() => router.push('/chat-test')}
            className="w-full btn-primary flex items-center justify-center"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            开始与赛斯对话
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </motion.div>

        {/* 感谢信息 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-sm text-gray-400"
        >
          <p>感谢您对与赛斯对话的支持！</p>
          <p className="mt-2">现在您可以享受更多的智慧对话体验</p>
        </motion.div>
      </motion.div>
    </div>
  )
}