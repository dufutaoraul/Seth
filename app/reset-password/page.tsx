'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { ArrowLeft, Key } from 'lucide-react'

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [hasValidToken, setHasValidToken] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // 不要在useEffect中检查和跳转，只标记状态
    // 给足够时间让hash参数加载
    const checkToken = async () => {
      // 等待一小段时间确保hash已加载
      await new Promise(resolve => setTimeout(resolve, 500))

      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      console.log('检查重置token:', {
        hasHash: !!window.location.hash,
        hashLength: window.location.hash.length,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken
      })

      if (accessToken && refreshToken) {
        setHasValidToken(true)
      } else {
        setHasValidToken(false)
        toast.error('无效的重置链接，请重新申请')
      }

      setValidating(false)
    }

    checkToken()
  }, [])

  // 如果验证完成且无效，才跳转
  useEffect(() => {
    if (!validating && !hasValidToken) {
      const timer = setTimeout(() => {
        router.push('/')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [validating, hasValidToken, router])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      toast.error('密码至少需要6位字符')
      return
    }

    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        console.error('Password update error:', error)
        toast.error(error.message || '密码重置失败')
        return
      }

      toast.success('密码重置成功！正在跳转到登录页面...')
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (error: any) {
      console.error('Password reset error:', error)
      toast.error(error.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  // 验证中显示加载
  if (validating) {
    return (
      <div className="min-h-screen bg-seth-dark flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-seth-gold rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Key className="w-8 h-8 text-seth-dark" />
          </div>
          <p className="text-seth-gold">验证重置链接...</p>
        </div>
      </div>
    )
  }

  // 验证失败
  if (!hasValidToken) {
    return (
      <div className="min-h-screen bg-seth-dark flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-white" />
          </div>
          <p className="text-red-400 mb-4">无效的重置链接</p>
          <p className="text-gray-400 text-sm">正在跳转到首页...</p>
        </div>
      </div>
    )
  }

  // 验证成功，显示表单
  return (
    <div className="min-h-screen bg-seth-dark flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-700">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-seth-gold rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-seth-dark" />
            </div>
            <h1 className="text-2xl font-bold mb-2">重置密码</h1>
            <p className="text-gray-400">请输入您的新密码</p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">新密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="请输入新密码（至少6位字符）"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">确认新密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder="请再次输入新密码"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '重置中...' : '重置密码'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-seth-gold hover:text-yellow-400 transition-colors flex items-center justify-center mx-auto"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回首页
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// 需要导入XCircle
import { XCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-seth-dark flex items-center justify-center">
        <div className="text-seth-gold">加载中...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
