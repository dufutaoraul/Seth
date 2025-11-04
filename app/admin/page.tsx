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

interface OrderInfo {
  id: string
  order_no: string
  membership_type: string
  amount_yuan: number
  credits_to_add: number
  payment_method: string
  payment_status: string
  zpay_trade_no: string | null
  paid_at: string | null
  created_at: string
  order_type: string
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [selectedUserOrders, setSelectedUserOrders] = useState<{
    user: { id: string; email: string }
    credits: any
    recent_orders: OrderInfo[]
  } | null>(null)
  const [loadingOrdersEmail, setLoadingOrdersEmail] = useState<string | null>(null)
  const [filterMode, setFilterMode] = useState<'all' | 'real' | 'test'>('all') // 筛选模式
  const router = useRouter()

  // 管理员密码
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin'

  // 真实用户的判断标准：2025年10月3日 00:00:00之后创建的
  const REAL_USER_CUTOFF = new Date('2025-10-03T00:00:00')

  // 判断是否为真实用户
  const isRealUser = (user: UserInfo) => {
    const createdAt = new Date(user.created_at)
    return createdAt >= REAL_USER_CUTOFF
  }

  // 筛选用户列表
  const filteredUsers = users.filter(user => {
    if (filterMode === 'all') return true
    if (filterMode === 'real') return isRealUser(user)
    if (filterMode === 'test') return !isRealUser(user)
    return true
  })

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

      // 直接调用API，不需要session验证
      const response = await fetch('/api/admin/users')

      if (response.ok) {
        const data = await response.json()
        console.log('管理后台数据:', data)
        setUsers(data.users || [])
      } else {
        console.error('API返回错误:', response.status, await response.text())
        alert('加载用户数据失败，请检查控制台')
      }
    } catch (error) {
      console.error('加载用户数据失败:', error)
      alert('加载失败: ' + (error instanceof Error ? error.message : '未知错误'))
    } finally {
      setLoading(false)
    }
  }

  const loadUserOrders = async (email: string) => {
    try {
      setLoadingOrdersEmail(email) // 标记正在加载的用户
      const response = await fetch(`/api/payment/check-order?email=${email}`)

      if (response.ok) {
        const data = await response.json()
        setSelectedUserOrders(data)
        setShowOrderModal(true)
      } else {
        alert('加载订单失败')
      }
    } catch (error) {
      console.error('加载订单失败:', error)
      alert('加载订单失败')
    } finally {
      setLoadingOrdersEmail(null) // 清除加载状态
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
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex justify-between items-center">
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

          {/* 筛选按钮 */}
          <div className="flex gap-3">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-4 py-2 rounded font-semibold transition ${
                filterMode === 'all'
                  ? 'bg-seth-gold text-black'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              全部用户 ({users.length})
            </button>
            <button
              onClick={() => setFilterMode('real')}
              className={`px-4 py-2 rounded font-semibold transition ${
                filterMode === 'real'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              ⭐ 真实用户 ({users.filter(u => isRealUser(u)).length})
            </button>
            <button
              onClick={() => setFilterMode('test')}
              className={`px-4 py-2 rounded font-semibold transition ${
                filterMode === 'test'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              测试数据 ({users.filter(u => !isRealUser(u)).length})
            </button>
          </div>

          <div className="text-sm text-gray-400">
            💡 真实用户定义：2025年10月3日之后注册的用户
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="text-gray-400 text-sm mb-2">当前显示</div>
            <div className="text-3xl font-bold text-white">{filteredUsers.length}</div>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="text-gray-400 text-sm mb-2">付费会员</div>
            <div className="text-3xl font-bold text-seth-gold">
              {filteredUsers.filter(u => u.current_membership !== '普通会员').length}
            </div>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="text-gray-400 text-sm mb-2">标准会员</div>
            <div className="text-3xl font-bold text-seth-orange">
              {filteredUsers.filter(u => u.current_membership === '标准会员').length}
            </div>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="text-gray-400 text-sm mb-2">高级会员</div>
            <div className="text-3xl font-bold text-yellow-400">
              {filteredUsers.filter(u => u.current_membership === '高级会员').length}
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
                  <th className="text-left p-4 text-gray-300">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.user_id} className={`border-t border-gray-700 hover:bg-gray-750 ${
                    isRealUser(user) ? 'bg-green-900 bg-opacity-10' : ''
                  }`}>
                    <td className="p-4 text-white">
                      <div className="flex items-center gap-2">
                        {isRealUser(user) && (
                          <span className="text-green-400 text-sm" title="真实付费用户">⭐</span>
                        )}
                        {user.email}
                      </div>
                    </td>
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
                    <td className="p-4">
                      <button
                        onClick={() => loadUserOrders(user.email)}
                        disabled={loadingOrdersEmail === user.email}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition disabled:opacity-50"
                      >
                        {loadingOrdersEmail === user.email ? '加载中...' : '查看订单'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 订单详情模态框 */}
        {showOrderModal && selectedUserOrders && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={() => setShowOrderModal(false)}>
            <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* 模态框头部 */}
              <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-seth-gold">订单详情</h2>
                  <p className="text-gray-400 mt-1">{selectedUserOrders.user.email}</p>
                </div>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {/* 用户积分信息 */}
              <div className="p-6 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">当前积分状态</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">会员等级</div>
                    <div className="text-xl font-bold text-seth-gold">
                      {selectedUserOrders.credits.current_membership}
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">总积分</div>
                    <div className="text-xl font-bold text-white">
                      {selectedUserOrders.credits.total_credits}
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">已使用</div>
                    <div className="text-xl font-bold text-gray-300">
                      {selectedUserOrders.credits.used_credits}
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">剩余</div>
                    <div className="text-xl font-bold text-green-400">
                      {selectedUserOrders.credits.remaining_credits}
                    </div>
                  </div>
                </div>
                {selectedUserOrders.credits.membership_expires_at && (
                  <div className="mt-4 text-gray-400 text-sm">
                    到期时间：{new Date(selectedUserOrders.credits.membership_expires_at).toLocaleString('zh-CN')}
                  </div>
                )}
              </div>

              {/* 订单列表 */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  订单记录 ({selectedUserOrders.recent_orders.length})
                </h3>
                {selectedUserOrders.recent_orders.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">暂无订单记录</div>
                ) : (
                  <div className="space-y-4">
                    {selectedUserOrders.recent_orders.map((order) => (
                      <div key={order.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-semibold text-white">
                                {order.membership_type}
                              </div>
                              {/* 订单类型标签 */}
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                order.order_type === 'upgrade' ? 'bg-purple-600 text-white' :
                                order.order_type === 'credit_pack' ? 'bg-blue-600 text-white' :
                                'bg-gray-600 text-white'
                              }`}>
                                {order.order_type === 'upgrade' ? '升级' :
                                 order.order_type === 'credit_pack' ? '积分包' : '会员'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400">
                              订单号：{order.order_no}
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded text-xs font-semibold ${
                            order.payment_status === 'paid' ? 'bg-green-600 text-white' :
                            order.payment_status === 'pending' ? 'bg-yellow-600 text-white' :
                            'bg-red-600 text-white'
                          }`}>
                            {order.payment_status === 'paid' ? '已支付' :
                             order.payment_status === 'pending' ? '待支付' : '失败'}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-gray-400">金额：</span>
                            <span className="text-white font-semibold">¥{order.amount_yuan}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">积分：</span>
                            <span className="text-green-400 font-semibold">+{order.credits_to_add}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">支付方式：</span>
                            <span className="text-white">{order.payment_method === 'alipay' ? '支付宝' : order.payment_method}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">类型：</span>
                            <span className="text-white">
                              {order.order_type === 'membership' ? '会员套餐' :
                               order.order_type === 'upgrade' ? '升级套餐' : '积分包'}
                            </span>
                          </div>
                        </div>

                        {order.zpay_trade_no && (
                          <div className="mt-3 text-xs text-gray-400 border-t border-gray-600 pt-3">
                            <div>支付流水号：{order.zpay_trade_no}</div>
                          </div>
                        )}

                        <div className="mt-3 flex justify-between text-xs text-gray-400">
                          <div>
                            创建时间：{new Date(order.created_at).toLocaleString('zh-CN')}
                          </div>
                          {order.paid_at && (
                            <div className="text-green-400">
                              支付时间：{new Date(order.paid_at).toLocaleString('zh-CN')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 模态框底部 */}
              <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 p-4 flex justify-end">
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded transition"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}