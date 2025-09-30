'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface UserInfo {
  user_id: string
  email: string
  current_membership: string
  total_credits: number
  used_credits: number
  remaining_credits: number
  membership_expires_at: string | null
  created_at: string
  updated_at: string
  status: string
  days_remaining: number | null
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  // 简单的密码验证（生产环境应该使用更安全的方式）
  const ADMIN_PASSWORD = 'seth2025admin' // 请在部署后修改此密码

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      sessionStorage.setItem('admin_auth', 'true')
      loadUsers()
    } else {
      alert('密码错误')
    }
  }

  const loadUsers = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        return
      }

      // 调用API获取所有用户数据
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('加载用户数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth')
    if (auth === 'true') {
      setIsAuthenticated(true)
      loadUsers()
    }
  }, [])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-seth-dark flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg w-96">
          <h1 className="text-2xl font-bold text-seth-gold mb-6">管理后台登录</h1>
          <input
            type="password"
            placeholder="请输入管理员密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded mb-4"
          />
          <button
            onClick={handleLogin}
            className="w-full bg-seth-gold text-black py-2 rounded font-semibold hover:bg-yellow-500 transition"
          >
            登录
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-seth-dark flex items-center justify-center">
        <div className="text-seth-gold text-xl">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-seth-dark p-8">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-seth-gold">用户管理后台</h1>
          <div className="flex gap-4">
            <button
              onClick={loadUsers}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition"
            >
              刷新数据
            </button>
            <button
              onClick={() => {
                sessionStorage.removeItem('admin_auth')
                setIsAuthenticated(false)
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition"
            >
              退出登录
            </button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="text-gray-400 text-sm mb-2">总用户数</div>
            <div className="text-3xl font-bold text-white">{users.length}</div>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="text-gray-400 text-sm mb-2">付费会员</div>
            <div className="text-3xl font-bold text-seth-gold">
              {users.filter(u => u.current_membership !== '普通会员').length}
            </div>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="text-gray-400 text-sm mb-2">标准会员</div>
            <div className="text-3xl font-bold text-seth-orange">
              {users.filter(u => u.current_membership === '标准会员').length}
            </div>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="text-gray-400 text-sm mb-2">高级会员</div>
            <div className="text-3xl font-bold text-yellow-400">
              {users.filter(u => u.current_membership === '高级会员').length}
            </div>
          </div>
        </div>

        {/* 用户列表 */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-left p-4 text-gray-300">邮箱</th>
                  <th className="text-left p-4 text-gray-300">会员等级</th>
                  <th className="text-left p-4 text-gray-300">总积分</th>
                  <th className="text-left p-4 text-gray-300">已用</th>
                  <th className="text-left p-4 text-gray-300">剩余</th>
                  <th className="text-left p-4 text-gray-300">到期时间</th>
                  <th className="text-left p-4 text-gray-300">状态</th>
                  <th className="text-left p-4 text-gray-300">剩余天数</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.user_id} className="border-t border-gray-700 hover:bg-gray-750">
                    <td className="p-4 text-white">{user.email}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        user.current_membership === '高级会员' ? 'bg-yellow-500 text-black' :
                        user.current_membership === '标准会员' ? 'bg-orange-500 text-white' :
                        'bg-gray-600 text-gray-300'
                      }`}>
                        {user.current_membership}
                      </span>
                    </td>
                    <td className="p-4 text-white">{user.total_credits}</td>
                    <td className="p-4 text-gray-400">{user.used_credits}</td>
                    <td className="p-4">
                      <span className={`font-bold ${
                        user.remaining_credits === 0 ? 'text-red-400' :
                        user.remaining_credits < 5 ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {user.remaining_credits}
                      </span>
                    </td>
                    <td className="p-4 text-gray-300">
                      {user.membership_expires_at
                        ? new Date(user.membership_expires_at).toLocaleDateString('zh-CN')
                        : '永久'
                      }
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        user.status === '已过期' ? 'bg-red-600 text-white' :
                        user.status === '有效' ? 'bg-green-600 text-white' :
                        'bg-gray-600 text-gray-300'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="p-4 text-white">
                      {user.days_remaining !== null ? `${Math.floor(user.days_remaining)}天` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}