'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { Sparkles, MessageCircle, Star } from 'lucide-react'

export default function HomePage() {
  const [isLogin, setIsLogin] = useState(true)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
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

    if (password.length < 6) {
      toast.error('密码至少需要6位字符')
      return
    }

    setLoading(true)

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          console.error('Login error:', error)
          if (error.message.includes('Invalid login credentials')) {
            toast.error('邮箱或密码错误，请检查后重试')
          } else if (error.message.includes('Email not confirmed')) {
            toast.error('请先验证邮箱，检查您的邮件收件箱')
          } else {
            toast.error(error.message || '登录失败')
          }
          return
        }

        toast.success('登录成功，正在跳转...')
        console.log('Login successful, user:', data.user?.id)

        // 添加小延迟确保认证状态同步
        setTimeout(() => {
          window.location.href = '/chat-test'
        }, 1500)
      } else {
        // 注册前先检查用户是否已存在
        const { data: existingUser } = await supabase.auth.signInWithPassword({
          email,
          password: 'dummy', // 用于检测用户是否存在
        })

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/chat-simple`,
          },
        })

        if (error) {
          console.error('Signup error:', error)
          if (error.message.includes('already registered')) {
            toast.error('该邮箱已注册，请直接登录或使用忘记密码功能')
            setIsLogin(true) // 切换到登录模式
          } else if (error.message.includes('password')) {
            toast.error('密码格式不正确，请使用至少6位字符的密码')
          } else {
            toast.error(error.message || '注册失败')
          }
          return
        }

        if (data.user && !data.user.email_confirmed_at) {
          toast.success('注册成功！请检查邮箱验证链接完成注册')
        } else {
          toast.success('注册成功！')
          setTimeout(() => {
            window.location.href = '/chat-simple'
          }, 1500)
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error)
      toast.error(error.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error('请输入邮箱地址')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        console.error('Password reset error:', error)
        toast.error(error.message || '发送重置邮件失败')
        return
      }

      toast.success('密码重置邮件已发送，请检查您的邮箱')
      setIsForgotPassword(false)
      setIsLogin(true)
    } catch (error: any) {
      console.error('Password reset error:', error)
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
              {isForgotPassword ? '重置密码' : (isLogin ? '欢迎回来' : '开始你的探索之旅')}
            </h2>
            <p className="text-gray-400">
              {isForgotPassword
                ? '输入邮箱地址，我们将发送重置链接'
                : (isLogin ? '登录继续与赛斯对话' : '注册开启智慧之门')}
            </p>
          </div>

          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">邮箱地址</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="请输入注册时使用的邮箱地址"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '发送中...' : '发送重置邮件'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-seth-gold hover:text-yellow-400 transition-colors"
                >
                  返回登录
                </button>
              </div>
            </form>
          ) : (
            <>
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
                    placeholder={isLogin ? "请输入密码" : "请输入密码（至少6位字符）"}
                    required
                  />
                </div>

                {isLogin && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-sm text-seth-orange hover:text-orange-400 transition-colors"
                    >
                      忘记密码？
                    </button>
                  </div>
                )}

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
            </>
          )}

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