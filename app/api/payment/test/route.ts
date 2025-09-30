import { NextRequest, NextResponse } from 'next/server'

// 强制动态路由
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'ZPay测试端点正常',
    timestamp: new Date().toISOString(),
    url: request.url
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData()
    const params: Record<string, any> = {}

    for (const [key, value] of body.entries()) {
      params[key] = value.toString()
    }

    return NextResponse.json({
      success: true,
      message: 'ZPay POST测试成功',
      received_params: params,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'POST测试失败',
      message: (error as Error).message
    }, { status: 500 })
  }
}