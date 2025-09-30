'use client'

import { useState } from 'react'

export default function TestPaymentPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testPaymentFlow = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/test-payment-flow', {
        method: 'POST'
      })

      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({
        error: '测试失败',
        message: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">支付流程测试</h1>

        <button
          onClick={testPaymentFlow}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium"
        >
          {loading ? '测试中...' : '测试支付回调'}
        </button>

        {result && (
          <div className="mt-8 bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">测试结果：</h2>
            <pre className="text-sm overflow-auto bg-gray-700 p-4 rounded whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 text-sm text-gray-400">
          <p>这个页面测试支付回调流程，模拟ZPay支付成功后的处理。</p>
          <p>如果测试成功，会将pending订单标记为paid并增加积分。</p>
        </div>
      </div>
    </div>
  )
}