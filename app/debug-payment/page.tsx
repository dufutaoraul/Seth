'use client'

import { useEffect, useState } from 'react'

interface DebugInfo {
  timestamp: string
  environment: {
    NODE_ENV?: string
    VERCEL_URL?: string
    NEXT_PUBLIC_SITE_URL?: string
    [key: string]: any
  }
  urls: {
    current_request_url: string
    calculated_base_url: string
    notify_url: string
    test_webhook_url: string
    return_url: string
  }
  suggestions: string[]
}

export default function DebugPaymentPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        const response = await fetch('/api/payment/debug')
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const data = await response.json()
        setDebugInfo(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取调试信息失败')
      } finally {
        setLoading(false)
      }
    }

    fetchDebugInfo()
  }, [])

  const testWebhook = async () => {
    try {
      const response = await fetch('/api/payment/test-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'test=true&timestamp=' + Date.now()
      })
      const result = await response.json()
      alert('测试结果: ' + JSON.stringify(result, null, 2))
    } catch (err) {
      alert('测试失败: ' + (err instanceof Error ? err.message : '未知错误'))
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-seth-dark flex items-center justify-center">
      <div className="text-seth-gold">加载调试信息...</div>
    </div>
  }

  if (error) {
    return <div className="min-h-screen bg-seth-dark flex items-center justify-center">
      <div className="text-red-500">错误: {error}</div>
    </div>
  }

  return (
    <div className="min-h-screen bg-seth-dark p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-seth-gold mb-8">支付系统诊断</h1>

        {debugInfo && (
          <div className="space-y-6">
            {/* 环境变量 */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-seth-orange mb-4">环境变量配置</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(debugInfo.environment).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center p-3 bg-gray-900 rounded">
                    <span className="text-gray-300">{key}:</span>
                    <span className={`font-mono ${value === '未设置' ? 'text-red-400' : 'text-green-400'}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* URL配置 */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-seth-orange mb-4">URL配置</h2>
              <div className="space-y-3">
                {Object.entries(debugInfo.urls).map(([key, value]) => (
                  <div key={key} className="p-3 bg-gray-900 rounded">
                    <div className="text-gray-400 text-sm">{key}:</div>
                    <div className="text-white font-mono text-sm break-all">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 建议 */}
            {debugInfo.suggestions.length > 0 && (
              <div className="bg-yellow-900/30 border border-yellow-600 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-yellow-400 mb-4">修复建议</h2>
                <ul className="space-y-2">
                  {debugInfo.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-yellow-100 flex items-start">
                      <span className="text-yellow-400 mr-2">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 测试工具 */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-seth-orange mb-4">测试工具</h2>
              <div className="space-y-4">
                <button
                  onClick={testWebhook}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  测试Webhook端点
                </button>
                <div className="text-gray-400 text-sm">
                  点击此按钮测试我们的webhook端点是否正常工作
                </div>
              </div>
            </div>

            {/* 操作指南 */}
            <div className="bg-blue-900/30 border border-blue-600 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-blue-400 mb-4">修复步骤</h2>
              <ol className="space-y-3 text-blue-100">
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">1</span>
                  登录 Vercel 控制台
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">2</span>
                  进入项目设置 → Environment Variables
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">3</span>
                  添加或更新 <code className="bg-gray-700 px-2 py-1 rounded text-white">NEXT_PUBLIC_SITE_URL</code> 为您的Vercel域名 (例如: https://your-app.vercel.app)
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">4</span>
                  重新部署项目
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">5</span>
                  重新测试支付流程
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}