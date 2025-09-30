import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { email, orderNo } = await request.json()

    if (!email || !orderNo) {
      return NextResponse.json({ error: '需要提供邮箱和订单号' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // 根据邮箱查找用户
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers()

    if (userError) {
      return NextResponse.json({ error: '查询用户失败' }, { status: 500 })
    }

    const user = users.find(u => u.email === email)

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 查找订单
    const { data: paymentOrder, error: findError } = await supabaseAdmin
      .from('payment_orders')
      .select('*')
      .eq('order_no', orderNo)
      .eq('user_id', user.id)
      .single()

    if (findError || !paymentOrder) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 })
    }

    // 检查订单是否已处理
    if (paymentOrder.payment_status === 'paid') {
      return NextResponse.json({
        message: '订单已处理',
        order: paymentOrder
      })
    }

    // 更新订单状态
    const { error: updateOrderError } = await supabaseAdmin
      .from('payment_orders')
      .update({
        payment_status: 'paid',
        zpay_trade_no: 'MANUAL_FIX_' + Date.now(),
        paid_at: new Date().toISOString(),
      })
      .eq('id', paymentOrder.id)

    if (updateOrderError) {
      return NextResponse.json({ error: '更新订单失败' }, { status: 500 })
    }

    // 获取用户当前积分
    const { data: currentCredits, error: creditsError } = await supabaseAdmin
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (creditsError) {
      return NextResponse.json({ error: '获取积分信息失败' }, { status: 500 })
    }

    // 计算新的会员到期时间
    const now = new Date()
    const newExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30天

    // 更新用户积分和会员信息
    const newTotalCredits = currentCredits.total_credits + paymentOrder.credits_to_add

    const { error: updateCreditsError } = await supabaseAdmin
      .from('user_credits')
      .update({
        total_credits: newTotalCredits,
        current_membership: paymentOrder.membership_type,
        membership_expires_at: newExpiry.toISOString(),
      })
      .eq('user_id', user.id)

    if (updateCreditsError) {
      return NextResponse.json({ error: '更新积分失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '订单已手动处理完成',
      order: {
        order_no: orderNo,
        membership_type: paymentOrder.membership_type,
        credits_added: paymentOrder.credits_to_add,
        new_total_credits: newTotalCredits,
        membership_expires_at: newExpiry.toISOString(),
      }
    })
  } catch (error) {
    console.error('手动修复订单错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}