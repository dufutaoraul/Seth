import { NextRequest, NextResponse } from 'next/server'

// 强制动态路由
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      ZPAY_PID: process.env.ZPAY_PID ? '已设置' : '未设置',
      ZPAY_KEY: process.env.ZPAY_KEY ? '已设置' : '未设置',
      ZPAY_GATEWAY: process.env.ZPAY_GATEWAY ? '已设置' : '未设置',
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '已设置' : '未设置',
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '已设置' : '未设置',
    },
    urls: {
      current_request_url: request.url,
      calculated_base_url: baseUrl,
      notify_url: `${baseUrl}/api/payment/notify`,
      test_webhook_url: `${baseUrl}/api/payment/test-webhook`,
      return_url: `${baseUrl}/payment/success`,
    },
    suggestions: [] as string[]
  }

  // 添加建议
  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    debugInfo.suggestions.push('需要设置 NEXT_PUBLIC_SITE_URL 环境变量为 Vercel 域名')
  }

  if (process.env.VERCEL_URL && !process.env.NEXT_PUBLIC_SITE_URL) {
    debugInfo.suggestions.push(`建议设置 NEXT_PUBLIC_SITE_URL=https://${process.env.VERCEL_URL}`)
  }

  if (!debugInfo.urls.calculated_base_url.startsWith('https://')) {
    debugInfo.suggestions.push('ZPay 回调需要 HTTPS URL，确保生产环境使用 HTTPS')
  }

  return NextResponse.json(debugInfo, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  })
}