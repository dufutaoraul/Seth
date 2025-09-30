'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugCreditsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDebugData = async () => {
      try {
        // 获取用户信息
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setData({ error: '用户未登录' })
          return
        }

        // 直接查询用户积分
        const { data: userCredits, error: creditsError } = await supabase
          .from('user_credits')
          .select('*')
          .eq('user_id', user.id)
          .single()

        // 查询用户的聊天会话
        const { data: sessions, error: sessionsError } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })

        // 查询用户的聊天消息数量
        const { data: messages, error: messagesError } = await supabase
          .from('chat_messages')
          .select('id, message_type, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        setData({
          user: {
            id: user.id,
            email: user.email
          },
          userCredits,
          creditsError,
          sessions,
          sessionsError,
          messages,
          messagesError,
          stats: {
            totalSessions: sessions?.length || 0,
            totalMessages: messages?.length || 0,
            userMessages: messages?.filter(m => m.message_type === 'user').length || 0,
            assistantMessages: messages?.filter(m => m.message_type === 'assistant').length || 0
          }
        })
      } catch (error: any) {
        setData({ error: error?.message || '未知错误' })
      } finally {
        setLoading(false)
      }
    }

    fetchDebugData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div>加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">积分调试信息</h1>

        <div className="bg-gray-800 p-6 rounded-lg">
          <pre className="text-sm overflow-auto whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>

        {data?.userCredits && (
          <div className="mt-6 bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">积分计算：</h2>
            <div className="space-y-2">
              <div>总积分: {data.userCredits.total_credits}</div>
              <div>已使用: {data.userCredits.used_credits}</div>
              <div>剩余积分: {data.userCredits.total_credits - data.userCredits.used_credits}</div>
              <div>用户消息数: {data.stats.userMessages}</div>
              <div className="text-red-400">
                差异: 用户消息数({data.stats.userMessages}) vs 已使用积分({data.userCredits.used_credits})
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}