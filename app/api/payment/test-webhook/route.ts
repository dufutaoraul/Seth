import { NextRequest, NextResponse } from 'next/server'

// 强制动态路由
export const dynamic = 'force-dynamic'

// 简单的测试端点，用于验证ZPay能否访问我们的服务器
export async function POST(request: NextRequest) {
  try {
    console.log('=== 测试Webhook收到请求 ===')
    console.log('时间:', new Date().toISOString())
    console.log('请求方法:', request.method)
    console.log('请求头:', Object.fromEntries(request.headers.entries()))

    // 尝试解析表单数据
    try {
      const formData = await request.formData()
      const params: Record<string, any> = {}

      const entries = Array.from(formData.entries())
      for (const [key, value] of entries) {
        params[key] = value.toString()
      }

      console.log('表单数据:', params)
    } catch (e) {
      console.log('无法解析表单数据:', e)
    }

    // 尝试解析JSON数据
    try {
      const text = await request.text()
      console.log('原始请求体:', text)
    } catch (e) {
      console.log('无法读取请求体:', e)
    }

    console.log('=== 测试Webhook处理完成 ===')

    return NextResponse.json({
      status: 'success',
      message: '测试端点正常工作',
      timestamp: new Date().toISOString(),
      received: true
    })
  } catch (error) {
    console.error('测试Webhook错误:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  console.log('=== 测试Webhook GET请求 ===')
  console.log('时间:', new Date().toISOString())
  console.log('URL:', request.url)

  return NextResponse.json({
    status: 'success',
    message: '测试端点正常工作 (GET)',
    timestamp: new Date().toISOString(),
    url: request.url
  })
}