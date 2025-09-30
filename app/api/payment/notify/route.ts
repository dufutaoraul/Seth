import { NextRequest, NextResponse } from 'next/server'

// 强制动态路由
export const dynamic = 'force-dynamic'

// 处理支付回调的核心逻辑
async function handlePaymentNotify(params: Record<string, any>) {
  console.log('=== ZPay回调开始 ===')
  console.log('回调参数:', params)

  // 环境变量检查
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const zpayKey = process.env.ZPAY_KEY

  if (!supabaseUrl || !supabaseServiceKey || !zpayKey) {
    console.error('缺少必要的环境变量')
    return new Response('fail', { status: 500 })
  }

  // 动态导入，避免构建时错误
  const { createClient } = await import('@supabase/supabase-js')
  const { createHash } = await import('crypto')

  // 创建 supabase 管理员客户端
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

    // 本地验证签名函数
    const verifyNotifySign = (params: Record<string, any>): boolean => {
      const { sign, ...otherParams } = params

      // 参数排序并生成待签名字符串
      const sortedParams: [string, any][] = []

      for (const key in otherParams) {
        if (!otherParams[key] || key === 'sign' || key === 'sign_type') {
          continue
        }
        sortedParams.push([key, otherParams[key]])
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

      const expectedSign = createHash('md5').update(prestr + zpayKey, 'utf8').digest('hex')
      return sign === expectedSign
    }

    // 验证签名
    if (!verifyNotifySign(params)) {
      console.error('ZPay回调签名验证失败')
      return new Response('fail', { status: 400 })
    }

    const {
      out_trade_no: orderNo,
      trade_no: zPayTradeNo,
      money: amount,
      name: productName,
    } = params

    if (!orderNo || !zPayTradeNo) {
      console.error('缺少必要的回调参数')
      return new Response('fail', { status: 400 })
    }

    // 查找订单
    const { data: paymentOrder, error: findError } = await supabaseAdmin
      .from('payment_orders')
      .select('*')
      .eq('order_no', orderNo)
      .single()

    if (findError || !paymentOrder) {
      console.error('订单不存在:', orderNo)
      return new Response('fail', { status: 404 })
    }

    // 检查订单是否已处理
    if (paymentOrder.payment_status === 'paid') {
      console.log('订单已处理:', orderNo)
      return new Response('success')
    }

    // 更新订单状态
    const { error: updateOrderError } = await supabaseAdmin
      .from('payment_orders')
      .update({
        payment_status: 'paid',
        zpay_trade_no: zPayTradeNo,
        zpay_response: JSON.stringify(params),
        paid_at: new Date().toISOString(),
      })
      .eq('id', paymentOrder.id)

    if (updateOrderError) {
      console.error('更新订单状态失败:', updateOrderError)
      return new Response('fail', { status: 500 })
    }

    // 更新用户积分
    const { data: currentCredits, error: creditsError } = await supabaseAdmin
      .from('user_credits')
      .select('*')
      .eq('user_id', paymentOrder.user_id)
      .single()

    if (creditsError) {
      console.error('获取用户积分失败:', creditsError)
      return new Response('fail', { status: 500 })
    }

    // 计算新的会员到期时间
    const now = new Date()
    const currentExpiry = currentCredits.membership_expires_at
      ? new Date(currentCredits.membership_expires_at)
      : now

    // 如果当前会员还没过期，从过期时间开始延长；否则从现在开始
    const startDate = currentExpiry > now ? currentExpiry : now
    const newExpiry = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000) // 30天

    // 更新用户积分和会员信息
    const newTotalCredits = currentCredits.total_credits + paymentOrder.credits_to_add
    console.log(`积分更新: ${currentCredits.total_credits} + ${paymentOrder.credits_to_add} = ${newTotalCredits}`)

    const { error: updateCreditsError } = await supabaseAdmin
      .from('user_credits')
      .update({
        total_credits: newTotalCredits, // 累加积分，不是替换
        current_membership: paymentOrder.membership_type,
        membership_expires_at: newExpiry.toISOString(),
      })
      .eq('user_id', paymentOrder.user_id)

    if (updateCreditsError) {
      console.error('更新用户积分失败:', updateCreditsError)
      return new Response('fail', { status: 500 })
    }

  console.log('支付成功处理完成:', orderNo)
  return new Response('success')
}

// 支持GET请求（ZPay官方使用GET）
export async function GET(request: NextRequest) {
  try {
    console.log('=== 收到GET回调请求 ===')

    // 从URL参数获取回调数据
    const { searchParams } = new URL(request.url)
    const params: Record<string, any> = {}

    for (const [key, value] of searchParams.entries()) {
      params[key] = value
    }

    console.log('GET参数:', params)

    return await handlePaymentNotify(params)
  } catch (error) {
    console.error('GET回调处理错误:', error)
    return new Response('fail', { status: 500 })
  }
}

// 兼容POST请求
export async function POST(request: NextRequest) {
  try {
    console.log('=== 收到POST回调请求 ===')

    // 从表单获取回调数据
    const formData = await request.formData()
    const params: Record<string, any> = {}

    const entries = Array.from(formData.entries())
    for (const [key, value] of entries) {
      params[key] = value.toString()
    }

    console.log('POST参数:', params)

    return await handlePaymentNotify(params)
  } catch (error) {
    console.error('POST回调处理错误:', error)
    return new Response('fail', { status: 500 })
  }
}