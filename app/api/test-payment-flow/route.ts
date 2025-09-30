import { NextRequest, NextResponse } from 'next/server'

// 强制动态路由
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('=== 支付流程测试开始 ===')

    const zpayKey = process.env.ZPAY_KEY
    if (!zpayKey) {
      return NextResponse.json({ error: 'ZPAY_KEY未配置' }, { status: 500 })
    }

    // 生成正确的签名
    const { createHash } = await import('crypto')

    const params = {
      out_trade_no: '20250929152456861', // 使用您的一个订单号
      zpay_trade_no: 'TEST123456789',
      money: '1.00',
      name: '标准会员'
    }

    // 生成签名
    const sortedParams: [string, string][] = []
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== 'sign') {
        sortedParams.push([key, value.toString()])
      }
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
    console.log('生成的签名:', sign)
    console.log('签名原文:', prestr + zpayKey)

    // 模拟ZPay支付成功回调数据
    const testPaymentData = new FormData()
    testPaymentData.append('out_trade_no', params.out_trade_no)
    testPaymentData.append('zpay_trade_no', params.zpay_trade_no)
    testPaymentData.append('money', params.money)
    testPaymentData.append('name', params.name)
    testPaymentData.append('sign', sign)

    // 调用我们的支付回调API
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seth-blush.vercel.app'
    const notifyUrl = `${baseUrl}/api/payment/notify`

    console.log('调用支付回调URL:', notifyUrl)

    const response = await fetch(notifyUrl, {
      method: 'POST',
      body: testPaymentData
    })

    const responseText = await response.text()
    console.log('回调响应状态:', response.status)
    console.log('回调响应内容:', responseText)

    return NextResponse.json({
      success: true,
      message: '支付流程测试完成',
      callback_url: notifyUrl,
      callback_status: response.status,
      callback_response: responseText,
      test_data: Object.fromEntries(testPaymentData.entries())
    })

  } catch (error: any) {
    console.error('支付流程测试失败:', error)
    return NextResponse.json({
      success: false,
      error: '支付流程测试失败',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}