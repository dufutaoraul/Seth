'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugChatPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testChatAPI = async () => {
    setLoading(true)
    setResult(null)

    try {
      // 获取当前用户session
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setResult({ error: '用户未登录' })
        return
      }

      console.log('发送测试请求到 /api/chat-simple')

      const response = await fetch('/api/chat-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: '你好，这是一个调试测试',
          conversationId: undefined,
          sessionId: undefined
        })
      })

      console.log('响应状态:', response.status)

      const data = await response.json()
      console.log('响应数据:', data)

      setResult({
        status: response.status,
        statusText: response.statusText,
        data: data
      })

    } catch (error: any) {
      console.error('测试请求失败:', error)
      setResult({
        error: '测试请求失败',
        message: error.message,
        stack: error.stack
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">聊天API调试页面</h1>

        <button
          onClick={testChatAPI}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium"
        >
          {loading ? '测试中...' : '测试聊天API'}
        </button>

        {result && (
          <div className="mt-8 bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">测试结果：</h2>
            <pre className="text-sm overflow-auto bg-gray-700 p-4 rounded">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 text-sm text-gray-400">
          <p>这个页面直接测试 /api/chat-simple API，可以获取详细的错误信息。</p>
          <p>请打开浏览器控制台查看详细日志。</p>
        </div>
      </div>
    </div>
  )
}