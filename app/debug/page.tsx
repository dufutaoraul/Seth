'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

export default function DebugPage() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      // 检查当前用户
      const { data: { user }, error } = await supabase.auth.getUser()
      console.log('Debug - User:', user, 'Error:', error)
      setUser(user)

      // 检查当前会话
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('Debug - Session:', session, 'Error:', sessionError)
      setSession(session)

      setLoading(false)
    }

    checkAuth()

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Debug - Auth state changed:', event, session)
      setUser(session?.user || null)
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: '3368327@qq.com', // 使用你的测试邮箱
      password: '123456' // 使用你的测试密码
    })

    console.log('Login result:', data, error)
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    console.log('Logout result:', error)
  }

  if (loading) {
    return <div className="min-h-screen bg-seth-dark flex items-center justify-center text-white">加载中...</div>
  }

  return (
    <div className="min-h-screen bg-seth-dark p-8 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">认证调试页面</h1>

        <div className="space-y-6">
          {/* 当前状态 */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">当前认证状态</h2>
            <div className="space-y-2">
              <div>用户状态: {user ? '✅ 已登录' : '❌ 未登录'}</div>
              {user && (
                <>
                  <div>用户ID: {user.id}</div>
                  <div>邮箱: {user.email}</div>
                  <div>邮箱验证: {user.email_confirmed_at ? '✅ 已验证' : '❌ 未验证'}</div>
                </>
              )}
              <div>会话状态: {session ? '✅ 存在' : '❌ 不存在'}</div>
              {session && (
                <>
                  <div>访问令牌: {session.access_token ? '✅ 存在' : '❌ 不存在'}</div>
                  <div>刷新令牌: {session.refresh_token ? '✅ 存在' : '❌ 不存在'}</div>
                </>
              )}
            </div>
          </div>

          {/* 调试操作 */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">调试操作</h2>
            <div className="flex space-x-4">
              <button
                onClick={handleLogin}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
              >
                测试登录
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
              >
                登出
              </button>
              <button
                onClick={() => window.location.href = '/chat-test'}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
              >
                跳转聊天页面
              </button>
            </div>
          </div>

          {/* Cookies 信息 */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Cookies 信息</h2>
            <div className="text-sm">
              <pre className="whitespace-pre-wrap">{document.cookie || '无 Cookies'}</pre>
            </div>
          </div>

          {/* 本地存储信息 */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">本地存储信息</h2>
            <div className="text-sm">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify({
                  localStorage: typeof window !== 'undefined' ? Object.keys(localStorage) : [],
                  sessionStorage: typeof window !== 'undefined' ? Object.keys(sessionStorage) : [],
                }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}