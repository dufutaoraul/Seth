'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { ArrowLeft, Key } from 'lucide-react'

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // 延迟检查token，确保hash参数已加载
    const timer = setTimeout(() => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (!accessToken || !refreshToken) {
        toast.error('无效的重置链接，请重新申请')
        router.push('/')
      }
    }, 300) // 延迟300ms检查

    return () => clearTimeout(timer)
  }, [router])

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