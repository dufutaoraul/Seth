import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createPaymentUrl, generateOrderNo, MEMBERSHIP_PLANS, CREDIT_PACKS, MembershipType, CreditPackType, ProductType } from '@/lib/zpay'

// 强制动态路由
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { productType, paymentMethod = 'alipay' } = await request.json()

    // 检查是会员套餐还是积分包
    const isMembership = productType in MEMBERSHIP_PLANS
    const isCreditPack = productType in CREDIT_PACKS

    if (!productType || (!isMembership && !isCreditPack)) {
      return NextResponse.json(
        { error: '无效的产品类型' },
        { status: 400 }
      )
    }

    // 从请求头获取授权信息
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '缺少授权头' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    // 验证用户身份
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('Payment API Auth error:', authError)
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    // 获取产品信息
    const product = isMembership
      ? MEMBERSHIP_PLANS[productType as MembershipType]
      : CREDIT_PACKS[productType as CreditPackType]

    if (product.price === 0) {
      return NextResponse.json(
        { error: '免费套餐无需支付' },
        { status: 400 }
      )
    }

    // 生成订单号
    const orderNo = generateOrderNo()

    // 创建支付订单记录
    const { data: paymentOrder, error: orderError } = await supabase
      .from('payment_orders')
      .insert([
        {
          user_id: user.id,
          order_no: orderNo,
          membership_type: isMembership ? productType : null,
          order_type: product.type,
          amount_yuan: product.price,
          credits_to_add: product.credits,
          payment_method: paymentMethod,
          payment_status: 'pending',
        },
      ])
      .select()
      .single()

    if (orderError) {
      console.error('创建支付订单失败:', orderError)
      return NextResponse.json(
        { error: '创建订单失败' },
        { status: 500 }
      )
    }

    // 生成支付URL
    const paymentUrl = createPaymentUrl(
      product.price,
      `${productType} - ${product.credits}次对话`,
      orderNo,
      paymentMethod as 'alipay' | 'wxpay' | 'qqpay'
    )

    return NextResponse.json({
      orderId: paymentOrder.id,
      orderNo,
      paymentUrl,
      amount: product.price,
    })
  } catch (error) {
    console.error('创建支付订单错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}