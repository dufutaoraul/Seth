'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, UserCredits, ChatSession, ChatMessage } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Plus,
  History,
  CreditCard,
  LogOut,
  Sparkles,
  User as UserIcon,
  Bot,
  Menu,
  X,
} from 'lucide-react'

interface Props {
  user: User
  userCredits: UserCredits | null
  sessions: ChatSession[]
}

export default function ChatInterface({ user, userCredits, sessions: initialSessions }: Props) {
  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions)
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [credits, setCredits] = useState(userCredits)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 加载会话消息
  const loadSessionMessages = async (sessionId: string) => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    setMessages(data || [])
  }

  // 创建新会话
  const createNewSession = async () => {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert([
        {
          user_id: user.id,
          title: '新对话',
        },
      ])
      .select()
      .single()

    if (error) {
      toast.error('创建会话失败')
      return
    }

    const newSession = data as ChatSession
    setSessions([newSession, ...sessions])
    setCurrentSession(newSession)
    setMessages([])
    setSidebarOpen(false)
  }

  // 选择会话
  const selectSession = (session: ChatSession) => {
    setCurrentSession(session)
    loadSessionMessages(session.id)
    setSidebarOpen(false)
  }

  // 发送消息
  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return

    // 检查积分
    if (!credits || credits.remaining_credits < 1) {
      toast.error('积分不足，请购买会员')
      router.push('/membership')
      return
    }

    // 如果没有当前会话，创建一个
    let sessionToUse = currentSession
    if (!sessionToUse) {
      await createNewSession()
      // 获取最新创建的会话
      const { data } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        sessionToUse = data as ChatSession
        setCurrentSession(sessionToUse)
      } else {
        toast.error('创建会话失败')
        return
      }
    }

    const userMessage = inputMessage
    setInputMessage('')
    setLoading(true)

    // 添加用户消息到界面
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: sessionToUse.id,
      user_id: user.id,
      message_type: 'user',
      content: userMessage,
      tokens_used: 0,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUserMessage])

    try {
      // 调用聊天API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId: sessionToUse.id,
          conversationId: messages.find(m => m.dify_conversation_id)?.dify_conversation_id,
        }),
      })

      if (!response.ok) {
        throw new Error('发送消息失败')
      }

      const data = await response.json()

      // 更新消息列表
      setMessages(prev => [
        ...prev.filter(m => !m.id.startsWith('temp-')),
        data.userMessage,
        data.assistantMessage,
      ])

      // 更新积分
      setCredits(data.updatedCredits)

      // 更新会话标题（如果是第一条消息）
      if (messages.length === 0) {
        const title = userMessage.slice(0, 20) + (userMessage.length > 20 ? '...' : '')
        await supabase
          .from('chat_sessions')
          .update({ title })
          .eq('id', sessionToUse.id)

        setSessions(prev =>
          prev.map(s => (s.id === sessionToUse.id ? { ...s, title } : s))
        )
      }
    } catch (error: any) {
      toast.error(error.message || '发送失败')
      // 移除临时消息
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')))
    } finally {
      setLoading(false)
    }
  }

  // 登出
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="flex h-screen bg-seth-dark">
      {/* 侧边栏 */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="fixed lg:relative z-50 w-80 bg-gray-800 border-r border-gray-700 flex flex-col"
          >
            {/* 侧边栏头部 */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-seth-gold">与赛斯对话</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* 用户信息 */}
              <div className="bg-gray-900 rounded-lg p-3 mb-4">
                <div className="flex items-center mb-2">
                  <UserIcon className="w-5 h-5 text-seth-gold mr-2" />
                  <span className="text-sm truncate">{user.email}</span>
                </div>
                <div className="text-sm text-gray-400">
                  剩余积分: <span className="text-seth-gold">{credits?.remaining_credits || 0}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {credits?.current_membership || '免费用户'}
                </div>
              </div>

              {/* 新对话按钮 */}
              <button
                onClick={createNewSession}
                className="w-full btn-primary flex items-center justify-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                新对话
              </button>
            </div>

            {/* 对话历史 */}
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                <History className="w-4 h-4 mr-2" />
                对话历史
              </h3>
              <div className="space-y-2">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => selectSession(session)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      currentSession?.id === session.id
                        ? 'bg-seth-gold text-seth-dark'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                  >
                    <div className="truncate font-medium">{session.title}</div>
                    <div className="text-xs opacity-75 mt-1">
                      {new Date(session.updated_at).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 侧边栏底部 */}
            <div className="p-4 border-t border-gray-700 space-y-2">
              <button
                onClick={() => router.push('/membership')}
                className="w-full btn-secondary flex items-center justify-center"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                会员中心
              </button>
              <button
                onClick={handleLogout}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                <LogOut className="w-5 h-5 mr-2" />
                退出登录
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部导航 */}
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden mr-3 text-gray-400 hover:text-white"
              >
                <Menu className="w-6 h-6" />
              </button>
              <Sparkles className="w-6 h-6 text-seth-gold mr-2" />
              <h1 className="text-xl font-bold">
                {currentSession?.title || '选择或创建新对话'}
              </h1>
            </div>
            <div className="hidden lg:flex items-center space-x-4">
              <div className="text-sm text-gray-400">
                积分: <span className="text-seth-gold">{credits?.remaining_credits || 0}</span>
              </div>
              <button
                onClick={() => router.push('/membership')}
                className="text-seth-orange hover:text-orange-400 transition-colors"
              >
                <CreditCard className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 聊天消息区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <motion.div
                className="text-6xl mb-4"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🤔
              </motion.div>
              <h2 className="text-2xl font-bold mb-2">开始与赛斯的智慧对话吧</h2>
              <p className="text-gray-400 mb-8">
                探索意识、现实和存在的深层奥秘
              </p>
              <p className="text-sm text-seth-gold">
                💡 尝试问问关于意识、现实和人生哲学的问题
              </p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${
                    message.message_type === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`flex items-start space-x-3 max-w-[80%] ${
                      message.message_type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.message_type === 'user'
                          ? 'bg-seth-gold text-seth-dark'
                          : 'bg-seth-orange text-white'
                      }`}
                    >
                      {message.message_type === 'user' ? (
                        <UserIcon className="w-5 h-5" />
                      ) : (
                        <Bot className="w-5 h-5" />
                      )}
                    </div>
                    <div
                      className={`px-4 py-3 rounded-2xl ${
                        message.message_type === 'user'
                          ? 'bg-seth-gold text-seth-dark rounded-br-sm'
                          : 'bg-gray-700 text-white rounded-bl-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-seth-orange flex items-center justify-center">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="bg-gray-700 text-white px-4 py-3 rounded-2xl rounded-bl-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div className="border-t border-gray-700 p-4">
          <div className="max-w-4xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                sendMessage()
              }}
              className="flex space-x-4"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="向赛斯提出你的问题..."
                className="flex-1 input-field"
                disabled={loading || !credits || credits.remaining_credits < 1}
              />
              <button
                type="submit"
                disabled={loading || !inputMessage.trim() || !credits || credits.remaining_credits < 1}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            <div className="text-xs text-gray-400 mt-2 flex justify-between">
              <span>剩余 {credits?.remaining_credits || 0}/2000 字符</span>
              <span>💡 尝试问问关于意识、现实和人生哲学的问题</span>
            </div>
          </div>
        </div>
      </div>

      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}