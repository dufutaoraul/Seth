import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyNotifySign } from '@/lib/zpay'

export async function POST(request: NextRequest) {
  try {
    // 获取ZPay回调参数
    const formData = await request.formData()
    const params: Record<string, any> = {}

    for (const [key, value] of formData.entries()) {
      params[key] = value.toString()
    }

    console.log('ZPay回调参数:', params)

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
    const { error: updateCreditsError } = await supabaseAdmin
      .from('user_credits')
      .update({
        total_credits: paymentOrder.credits_to_add,
        used_credits: 0, // 重置已使用积分
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
  } catch (error) {
    console.error('支付回调处理错误:', error)
    return new Response('fail', { status: 500 })
  }
}