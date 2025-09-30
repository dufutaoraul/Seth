import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'

// 测试ZPay回调 - 模拟真实的回调请求
export async function POST(request: NextRequest) {
  try {
    const { orderNo, amount } = await request.json()

    if (!orderNo) {
      return NextResponse.json({ error: '需要提供订单号' }, { status: 400 })
    }

    // 构造模拟的ZPay回调参数
    const zpayKey = process.env.ZPAY_KEY!
    const zpayPid = process.env.ZPAY_PID!

    const params: Record<string, any> = {
      pid: zpayPid,
      trade_no: 'TEST_' + Date.now(),
      out_trade_no: orderNo,
      type: 'alipay',
      name: '测试订单',
      money: amount || '1.00',
      trade_status: 'TRADE_SUCCESS',
    }

    // 生成签名（和ZPay一样的逻辑）
    const sortedParams: [string, any][] = []
    for (const key in params) {
      if (!params[key] || key === 'sign' || key === 'sign_type') {
        continue
      }
      sortedParams.push([key, params[key]])
    }
    sortedParams.sort((a, b) => a[0].localeCompare(b[0]))

    let prestr = ''
    for (let i = 0; i < sortedParams.length; i++) {
      const [key, value] = sortedParams[i]
      if (i === sortedParams.length - 1) {
        prestr += `${key}=${value}`
      } else {
        prestr += `${key}=${value}&`
      }
    }

    const sign = createHash('md5').update(prestr + zpayKey, 'utf8').digest('hex')
    params.sign = sign
    params.sign_type = 'MD5'

    console.log('=== 测试ZPay回调 ===')
    console.log('订单号:', orderNo)
    console.log('回调参数:', params)
    console.log('签名字符串:', prestr + zpayKey)
    console.log('签名:', sign)

    // 调用真实的notify接口
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const notifyUrl = `${baseUrl}/api/payment/notify`

    // 使用GET方式（ZPay官方使用GET）
    const queryParams = new URLSearchParams(params as Record<string, string>)
    const fullUrl = `${notifyUrl}?${queryParams.toString()}`

    console.log('调用notify接口:', fullUrl)

    const response = await fetch(fullUrl, { method: 'GET' })
    const responseText = await response.text()

    console.log('notify接口响应:', responseText)

    return NextResponse.json({
      success: true,
      message: '测试回调已发送',
      notify_response: responseText,
      params,
    })
  } catch (error: any) {
    console.error('测试回调错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}