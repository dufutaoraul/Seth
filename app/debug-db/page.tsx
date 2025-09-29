'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export default function DebugDB() {
  const [user, setUser] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        setError('获取用户失败: ' + userError.message)
        return
      }
      setUser(user)

      if (user) {
        await loadData(user.id)
      }
    } catch (err: any) {
      setError('检查用户失败: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadData = async (userId: string) => {
    try {
      // 查询会话
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (sessionsError) {
        console.error('查询会话失败:', sessionsError)
        setError('查询会话失败: ' + sessionsError.message)
      } else {
        setSessions(sessionsData || [])
        console.log('找到会话:', sessionsData)
      }

      // 查询消息
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (messagesError) {
        console.error('查询消息失败:', messagesError)
        setError('查询消息失败: ' + messagesError.message)
      } else {
        setMessages(messagesData || [])
        console.log('找到消息:', messagesData)
      }
    } catch (err: any) {
      setError('加载数据失败: ' + err.message)
      console.error('加载数据失败:', err)
    }
  }

  const testInsert = async () => {
    if (!user) return

    try {
      // 测试插入会话
      const { data: sessionData, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert([{
          user_id: user.id,
          title: '测试会话 ' + new Date().toLocaleString()
        }])
        .select()
        .single()

      if (sessionError) {
        setError('插入会话失败: ' + sessionError.message)
        console.error('插入会话失败:', sessionError)
        return
      }

      console.log('插入会话成功:', sessionData)

      // 测试插入消息
      const { data: messageData, error: messageError } = await supabase
        .from('chat_messages')
        .insert([{
          session_id: sessionData.id,
          user_id: user.id,
          message_type: 'user',
          content: '测试消息 ' + new Date().toLocaleString(),
          tokens_used: 0
        }])
        .select()
        .single()

      if (messageError) {
        setError('插入消息失败: ' + messageError.message)
        console.error('插入消息失败:', messageError)
        return
      }

      console.log('插入消息成功:', messageData)

      // 重新加载数据
      await loadData(user.id)

    } catch (err: any) {
      setError('测试插入失败: ' + err.message)
      console.error('测试插入失败:', err)
    }
  }

  if (loading) {
    return <div className="p-8">加载中...</div>
  }

  if (!user) {
    return <div className="p-8">请先登录</div>
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">数据库调试页面</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-blue-100 p-4 rounded">
        <h2 className="font-bold mb-2">当前用户</h2>
        <p>ID: {user.id}</p>
        <p>Email: {user.email}</p>
      </div>

      <button
        onClick={testInsert}
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
      >
        测试插入数据
      </button>

      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold mb-2">会话数据 ({sessions.length})</h2>
        <div className="space-y-2">
          {sessions.map((session, index) => (
            <div key={index} className="bg-white p-2 rounded border">
              <p><strong>ID:</strong> {session.id}</p>
              <p><strong>标题:</strong> {session.title}</p>
              <p><strong>创建时间:</strong> {new Date(session.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold mb-2">消息数据 ({messages.length})</h2>
        <div className="space-y-2">
          {messages.map((message, index) => (
            <div key={index} className="bg-white p-2 rounded border">
              <p><strong>ID:</strong> {message.id}</p>
              <p><strong>会话ID:</strong> {message.session_id}</p>
              <p><strong>类型:</strong> {message.message_type}</p>
              <p><strong>内容:</strong> {message.content}</p>
              <p><strong>创建时间:</strong> {new Date(message.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}