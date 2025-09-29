import { NextRequest, NextResponse } from 'next/server'
import { sendMessageToDify } from '@/lib/dify'

// 强制动态路由
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 检查环境变量
    const difyUrl = process.env.DIFY_API_URL
    const difyKey = process.env.DIFY_API_KEY

    if (!difyUrl || !difyKey) {
      return NextResponse.json({
        error: 'Dify环境变量未配置',
        difyUrl: difyUrl ? '已设置' : '未设置',
        difyKey: difyKey ? '已设置' : '未设置'
      }, { status: 500 })
    }

    // 测试Dify API调用
    console.log('测试Dify API连接...')
    console.log('DIFY_API_URL:', difyUrl)
    console.log('DIFY_API_KEY:', difyKey ? `${difyKey.substring(0, 10)}...` : '未设置')

    const testResponse = await sendMessageToDify(
      "你好，这是一个测试消息",
      "test-user-123"
    )

    return NextResponse.json({
      success: true,
      message: 'Dify API连接成功',
      response: testResponse
    })

  } catch (error: any) {
    console.error('Dify API测试失败:', error)

    return NextResponse.json({
      error: 'Dify API测试失败',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}