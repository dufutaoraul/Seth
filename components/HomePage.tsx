'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { Sparkles, MessageCircle, Star } from 'lucide-react'

export default function HomePage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('请填写邮箱和密码')
      return
    }

    setLoading(true)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        toast.success('登录成功')
        router.push('/chat')
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/chat`,
          },
        })
        if (error) throw error
        toast.success('注册成功，请检查邮箱验证链接')
      }
    } catch (error: any) {
      toast.error(error.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        {/* 左侧介绍 */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center lg:text-left"
        >
          <div className="flex items-center justify-center lg:justify-start mb-6">
            <Sparkles className="w-8 h-8 text-seth-gold mr-3" />
            <h1 className="text-4xl lg:text-6xl font-bold">
              与<span className="text-seth-gold">赛斯</span>对话
            </h1>
          </div>

          <p className="text-xl lg:text-2xl text-gray-300 mb-8">
            探索意识的本质，现实和存在的深层奥秘
          </p>

          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-center lg:justify-start">
              <MessageCircle className="w-6 h-6 text-seth-orange mr-3" />
              <span className="text-lg">开始与赛斯的智慧对话吧</span>
            </div>
            <div className="flex items-center justify-center lg:justify-start">
              <Star className="w-6 h-6 text-seth-gold mr-3" />
              <span className="text-lg">探索意识、现实和存在的深层奥秘</span>
            </div>
          </div>

          {/* 思考表情符号 */}
          <motion.div
            className="text-8xl mb-8"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
          >
            🤔
          </motion.div>

          <p className="text-lg text-gray-400">
            探索意识、现实和存在的深层奥秘
          </p>
        </motion.div>

        {/* 右侧登录注册表单 */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-700"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">
              {isLogin ? '欢迎回来' : '开始你的探索之旅'}
            </h2>
            <p className="text-gray-400">
              {isLogin ? '登录继续与赛斯对话' : '注册开启智慧之门'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">邮箱地址</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="请输入邮箱地址"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="请输入密码"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-seth-gold hover:text-yellow-400 transition-colors"
            >
              {isLogin ? '还没有账号？立即注册' : '已有账号？立即登录'}
            </button>
          </div>

          {/* 会员等级预览 */}
          <div className="mt-8 p-4 bg-gray-900/50 rounded-xl">
            <h3 className="text-lg font-semibold mb-3 text-center">会员权益</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>免费用户</span>
                <span className="text-seth-gold">15次对话/月</span>
              </div>
              <div className="flex justify-between">
                <span>标准会员</span>
                <span className="text-seth-orange">150次对话/月 ¥145</span>
              </div>
              <div className="flex justify-between">
                <span>高级会员</span>
                <span className="text-green-400">500次对话/月 ¥360</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}