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
  AlertCircle,
  Edit2,
  Trash2,
  Check,
  XCircle,
  Copy,
  Download,
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
  const [creditsLoading, setCreditsLoading] = useState(true) // 新增：积分加载状态
  const [sidebarOpen, setSidebarOpen] = useState(true) // 默认打开侧边栏显示会话列表
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null) // 正在编辑的会话ID
  const [editingTitle, setEditingTitle] = useState('') // 编辑中的标题
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 初始化时加载最新积分（强制刷新）
  useEffect(() => {
    const initializeCredits = async () => {
      console.log('=== 初始化积分 ===')
      console.log('传入的初始积分:', userCredits)
      setCreditsLoading(true) // 开始加载
      const updatedCredits = await loadUserCredits()
      console.log('API返回的最新积分:', updatedCredits)
      if (updatedCredits) {
        setCredits(updatedCredits)
        console.log('积分已更新为:', updatedCredits.remaining_credits)
      } else {
        console.warn('加载积分失败，使用初始积分')
        setCredits(userCredits)
      }
      setCreditsLoading(false) // 加载完成
    }
    initializeCredits()
  }, [])

  // 加载用户的聊天会话
  useEffect(() => {
    const loadUserSessions = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          return
        }

        const response = await fetch('/api/chat-history', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          const sessionsList = data.sessions || []
          setSessions(sessionsList)

          // 自动选择并加载最新的会话
          console.log('加载到的会话列表:', sessionsList.length, '个会话')
          sessionsList.forEach((session: any, index: number) => {
            console.log(`会话 ${index + 1}:`, session.title, session.updated_at)
          })

          if (sessionsList.length > 0) {
            const latestSession = sessionsList[0] // 已按时间排序
            console.log('自动选择最新会话:', latestSession)
            setCurrentSession(latestSession)
            loadSessionMessages(latestSession.id)
          } else {
            console.log('没有找到任何会话，将在发送消息时创建新会话')
          }
        }
      } catch (error) {
        console.error('加载聊天会话失败:', error)
      }
    }

    loadUserSessions()
  }, [user.id])

  // 加载会话消息
  const loadSessionMessages = async (sessionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('认证过期，请重新登录')
        return
      }

      const response = await fetch(`/api/chat-history?sessionId=${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('加载聊天历史失败')
      }

      const data = await response.json()
      setMessages(data.messages || [])
    } catch (error: any) {
      console.error('加载聊天历史失败:', error)
      toast.error(error.message || '加载聊天历史失败')
      setMessages([])
    }
  }

  // 加载用户积分
  const loadUserCredits = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return null

      const response = await fetch('/api/credits', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Cache-Control': 'no-cache',
        },
      })

      if (response.ok) {
        const data = await response.json()
        return data.credits
      }
      return null
    } catch (error) {
      console.error('加载用户积分失败:', error)
      return null
    }
  }

  // 创建新会话
  const createNewSession = async () => {
    // 清空当前会话和消息，下次发送消息时会在后端自动创建新会话
    setCurrentSession(null)
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

    // 检查积分（考虑即将扣除的1积分）
    if (!credits || credits.remaining_credits < 1) {
      console.log('积分检查失败，当前积分:', credits)
      toast.error('积分不足，请购买会员')
      console.log('积分不足，尝试跳转到会员页面: /membership')

      try {
        router.push('/membership')
        console.log('跳转命令已执行')
      } catch (error) {
        console.error('路由跳转失败:', error)
        window.location.href = '/membership'
      }
      return
    }

    console.log('积分检查通过，当前剩余:', credits.remaining_credits)

    // 如果没有当前会话，sessionId 传 null，后端会自动创建
    // 不在前端创建临时会话，避免 ID 格式问题

    const userMessage = inputMessage
    setInputMessage('')
    setLoading(true)

    // 添加用户消息到界面
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: currentSession?.id || '',
      user_id: user.id,
      message_type: 'user',
      content: userMessage,
      tokens_used: 0,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUserMessage])

    try {
      // 获取当前用户的访问令牌
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('认证过期，请重新登录')
        return
      }

      // 准备请求数据
      const requestData = {
        message: userMessage,
        sessionId: currentSession?.id,
        conversationId: messages.find(m => m.dify_conversation_id)?.dify_conversation_id,
      }

      console.log('=== ChatInterface 发送请求 ===')
      console.log('请求数据:', JSON.stringify(requestData, null, 2))
      console.log('当前会话:', currentSession)
      console.log('现有消息数量:', messages.length)

      // 调用流式聊天API
      const response = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || '发送消息失败')
      }

      // 创建assistant消息占位符
      const assistantMessageId = `assistant-${Date.now()}`
      const tempAssistantMessage: ChatMessage = {
        id: assistantMessageId,
        session_id: currentSession?.id || '',
        user_id: user.id,
        message_type: 'assistant',
        content: '',
        tokens_used: 0,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, tempAssistantMessage])

      // 读取SSE流
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法读取响应流')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let fullAnswer = ''  // 从Dify接收到的完整内容
      let displayedAnswer = ''  // 已经显示在界面上的内容
      let newSessionId = ''
      let newConversationId = ''
      let remainingCredits = credits?.remaining_credits || 0

      // 视觉缓冲队列：用于控制显示速度
      let pendingChunks: string[] = []
      let displayInterval: NodeJS.Timeout | null = null

      // 启动显示定时器（每50ms显示一些字符）
      const startDisplayTimer = () => {
        if (displayInterval) return

        displayInterval = setInterval(() => {
          if (pendingChunks.length === 0) {
            // 没有待显示内容，但检查是否已经全部接收完成
            if (displayedAnswer === fullAnswer && fullAnswer.length > 0) {
              // 全部显示完成，清除定时器
              if (displayInterval) {
                clearInterval(displayInterval)
                displayInterval = null
              }
            }
            return
          }

          // 从队列中取出内容进行显示（每次显示3个字符，平衡速度和流畅度）
          const chunkToDisplay = pendingChunks.shift() || ''
          displayedAnswer += chunkToDisplay

          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMessageId
                ? { ...m, content: displayedAnswer }
                : m
            )
          )
        }, 50) // 每50ms更新一次显示
      }

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) continue

            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)

              if (parsed.type === 'delta' && parsed.content) {
                // 收到增量内容，添加到完整答案和待显示队列
                fullAnswer += parsed.content

                // 将内容按字符分割加入队列（控制显示粒度）
                for (let i = 0; i < parsed.content.length; i += 3) {
                  pendingChunks.push(parsed.content.slice(i, i + 3))
                }

                // 启动显示定时器
                startDisplayTimer()
              } else if (parsed.type === 'done') {
                // 流结束
                newSessionId = parsed.sessionId
                newConversationId = parsed.conversationId
                remainingCredits = parsed.remainingCredits
              } else if (parsed.type === 'error') {
                throw new Error(parsed.error || '处理失败')
              }
            } catch (e) {
              console.error('解析SSE数据失败:', e)
            }
          }
        }

        // 等待所有内容显示完成
        while (displayedAnswer !== fullAnswer) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } finally {
        reader.releaseLock()
        if (displayInterval) {
          clearInterval(displayInterval)
        }
      }

      // 更新积分
      if (credits) {
        setCredits({
          ...credits,
          used_credits: credits.used_credits + 1,
          remaining_credits: remainingCredits
        })
      }

      // 如果创建了新会话，更新当前会话
      if (newSessionId && (!currentSession || currentSession.id !== newSessionId)) {
        const newSession = {
          id: newSessionId,
          user_id: user.id,
          title: userMessage.slice(0, 20) + (userMessage.length > 20 ? '...' : ''),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setCurrentSession(newSession)
        setSessions(prev => [newSession, ...prev])
      }

      // 暂时注释掉会话标题更新（需要数据库）
      // if (messages.length === 0) {
      //   const title = userMessage.slice(0, 20) + (userMessage.length > 20 ? '...' : '')
      //   await supabase
      //     .from('chat_sessions')
      //     .update({ title })
      //     .eq('id', sessionToUse.id)

      //   setSessions(prev =>
      //     prev.map(s => (s.id === sessionToUse.id ? { ...s, title } : s))
      //   )
      // }
    } catch (error: any) {
      toast.error(error.message || '发送失败')
      // 移除临时消息
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')))
    } finally {
      setLoading(false)
    }
  }

  // 开始编辑会话标题
  const startEditingSession = (session: ChatSession) => {
    setEditingSessionId(session.id)
    setEditingTitle(session.title)
  }

  // 保存编辑的标题
  const saveSessionTitle = async (sessionId: string) => {
    if (!editingTitle.trim()) {
      toast.error('标题不能为空')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('认证过期，请重新登录')
        return
      }

      const response = await fetch('/api/chat-session/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          sessionId,
          title: editingTitle.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error('更新标题失败')
      }

      // 更新本地状态
      setSessions(sessions.map(s =>
        s.id === sessionId ? { ...s, title: editingTitle.trim() } : s
      ))

      if (currentSession?.id === sessionId) {
        setCurrentSession({ ...currentSession, title: editingTitle.trim() })
      }

      setEditingSessionId(null)
      toast.success('标题已更新')
    } catch (error) {
      console.error('保存标题失败:', error)
      toast.error('保存失败，请重试')
    }
  }

  // 取消编辑
  const cancelEditing = () => {
    setEditingSessionId(null)
    setEditingTitle('')
  }

  // 删除会话
  const deleteSession = async (sessionId: string) => {
    if (!confirm('确定要删除这个对话吗？删除后无法恢复。')) {
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('认证过期，请重新登录')
        return
      }

      const response = await fetch('/api/chat-session/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ sessionId }),
      })

      if (!response.ok) {
        throw new Error('删除失败')
      }

      // 更新本地状态
      setSessions(sessions.filter(s => s.id !== sessionId))

      // 如果删除的是当前会话，清空消息
      if (currentSession?.id === sessionId) {
        setCurrentSession(null)
        setMessages([])
      }

      toast.success('对话已删除')
    } catch (error) {
      console.error('删除会话失败:', error)
      toast.error('删除失败，请重试')
    }
  }

  // 复制消息内容
  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast.success('已复制到剪贴板')
    } catch (error) {
      console.error('复制失败:', error)
      toast.error('复制失败，请重试')
    }
  }

  // 导出历史记录
  const exportHistory = () => {
    if (!currentSession || messages.length === 0) {
      toast.error('当前没有对话记录可导出')
      return
    }

    try {
      // 生成文本格式的对话记录
      let content = `与赛斯对话 - ${currentSession.title}\n`
      content += `导出时间：${new Date().toLocaleString()}\n`
      content += `${'='.repeat(50)}\n\n`

      messages.forEach((msg) => {
        const speaker = msg.message_type === 'user' ? '我' : '赛斯'
        const time = new Date(msg.created_at).toLocaleString()
        content += `【${speaker}】 ${time}\n`
        content += `${msg.content}\n\n`
      })

      // 检测是否在移动设备或微信浏览器
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const isWeChat = /MicroMessenger/i.test(navigator.userAgent)

      if (isMobile || isWeChat) {
        // 移动端：复制到剪贴板
        navigator.clipboard.writeText(content).then(() => {
          toast.success('对话记录已复制到剪贴板，可以粘贴到其他应用保存')
        }).catch(() => {
          // 如果clipboard API失败，显示内容让用户手动复制
          alert('对话记录：\n\n' + content.substring(0, 500) + '...\n\n请长按复制全部内容')
        })
      } else {
        // 桌面端：下载文件
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `赛斯对话-${currentSession.title}-${new Date().toLocaleDateString()}.txt`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        toast.success('对话记录已导出')
      }
    } catch (error) {
      console.error('导出失败:', error)
      toast.error('导出失败，请重试')
    }
  }

  // 登出
  const handleLogout = async () => {
    await supabase.auth.signOut()
    // 立即跳转到首页，不等待认证状态变化
    window.location.href = '/'
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
            className="fixed lg:relative z-50 w-80 h-screen bg-gray-800 border-r border-gray-700 flex flex-col"
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
                {creditsLoading ? (
                  // 加载骨架屏
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-400">剩余积分: </span>
                      <div className="ml-2 h-4 w-12 bg-gray-700 rounded animate-pulse"></div>
                    </div>
                    <div className="h-3 w-20 bg-gray-700 rounded animate-pulse"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-sm text-gray-400">
                      剩余积分: <button
                        onClick={() => router.push('/membership')}
                        className="text-seth-gold hover:text-yellow-300 transition-colors cursor-pointer"
                      >
                        {credits?.remaining_credits || 0}
                      </button>
                    </div>
                    <div className="text-xs text-gray-500">
                      {credits?.current_membership || '免费用户'}
                    </div>
                  </>
                )}
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
            <div className="flex-1 overflow-y-auto p-4 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
              <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                <History className="w-4 h-4 mr-2" />
                对话历史
              </h3>
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`relative group rounded-lg transition-colors ${
                      currentSession?.id === session.id
                        ? 'bg-seth-gold text-seth-dark'
                        : 'bg-gray-700 text-white'
                    }`}
                  >
                    {editingSessionId === session.id ? (
                      // 编辑模式
                      <div className="p-3">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="w-full bg-gray-800 text-white px-2 py-1 rounded border border-gray-600 focus:border-seth-gold focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveSessionTitle(session.id)
                            } else if (e.key === 'Escape') {
                              cancelEditing()
                            }
                          }}
                        />
                        <div className="flex items-center justify-end space-x-2 mt-2">
                          <button
                            onClick={() => saveSessionTitle(session.id)}
                            className="p-1 hover:bg-green-600 rounded transition-colors"
                            title="保存"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1 hover:bg-red-600 rounded transition-colors"
                            title="取消"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      // 正常显示模式
                      <>
                        <button
                          onClick={() => selectSession(session)}
                          className="w-full text-left p-3"
                        >
                          <div className="truncate font-medium pr-16">{session.title}</div>
                          <div className="text-xs opacity-75 mt-1">
                            {new Date(session.updated_at).toLocaleDateString()}
                          </div>
                        </button>
                        {/* 悬停显示的操作按钮 */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              startEditingSession(session)
                            }}
                            className={`p-1.5 rounded transition-colors ${
                              currentSession?.id === session.id
                                ? 'hover:bg-yellow-600'
                                : 'hover:bg-gray-600'
                            }`}
                            title="编辑标题"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteSession(session.id)
                            }}
                            className={`p-1.5 rounded transition-colors ${
                              currentSession?.id === session.id
                                ? 'hover:bg-red-600'
                                : 'hover:bg-gray-600'
                            }`}
                            title="删除对话"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
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
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="mr-3 text-gray-400 hover:text-white transition-colors"
                title={sidebarOpen ? "隐藏会话列表" : "显示会话列表"}
              >
                <Menu className="w-6 h-6" />
              </button>
              <Sparkles className="w-6 h-6 text-seth-gold mr-2" />
              <h1 className="text-xl font-bold">
                {currentSession?.title || '选择或创建新对话'}
              </h1>
            </div>
            <div className="flex items-center space-x-2 lg:space-x-4">
              {/* 导出按钮 - 手机端和电脑端都显示 */}
              {currentSession && messages.length > 0 && (
                <button
                  onClick={exportHistory}
                  className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
                  title="导出对话记录"
                >
                  <Download size={18} />
                  <span className="hidden lg:inline text-sm">导出</span>
                </button>
              )}
              {/* 电脑端显示积分和充值按钮 */}
              <div className="hidden lg:flex items-center space-x-4">
                {creditsLoading ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">积分: </span>
                    <div className="h-4 w-8 bg-gray-700 rounded animate-pulse"></div>
                  </div>
                ) : (
                  <button
                    onClick={() => router.push('/membership')}
                    className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    积分: <span className="text-seth-gold hover:text-yellow-300">{credits?.remaining_credits || 0}</span>
                  </button>
                )}
                <button
                  onClick={() => router.push('/membership')}
                  className="text-seth-orange hover:text-orange-400 transition-colors"
                >
                  <CreditCard className="w-5 h-5" />
                </button>
              </div>
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
                    <div className="relative group">
                      <div
                        className={`px-4 py-3 rounded-2xl ${
                          message.message_type === 'user'
                            ? 'bg-seth-gold text-seth-dark rounded-br-sm'
                            : 'bg-gray-700 text-white rounded-bl-sm'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                      {/* 复制按钮 - 只在赛斯的回复上显示 */}
                      {message.message_type === 'assistant' && (
                        <button
                          onClick={() => copyMessage(message.content)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-600 hover:bg-gray-500 text-white p-1.5 rounded"
                          title="复制"
                        >
                          <Copy size={14} />
                        </button>
                      )}
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
            {/* 积分不足提示 */}
            {credits && credits.remaining_credits < 1 && (
              <div className="mb-4 bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-red-400">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <span>积分不足，无法继续对话</span>
                  </div>
                  <button
                    onClick={() => {
                      console.log('点击购买会员按钮')
                      router.push('/membership')
                    }}
                    className="bg-seth-gold text-seth-dark px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 transition-colors"
                  >
                    购买会员
                  </button>
                </div>
              </div>
            )}

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
            <div className="text-xs text-gray-400 mt-2 text-center">
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