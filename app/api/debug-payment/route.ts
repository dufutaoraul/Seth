import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 强制动态路由
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 检查支付订单
    const { data: paymentOrders, error: ordersError } = await supabase
      .from('payment_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (ordersError) {
      return NextResponse.json({ error: '查询支付订单失败', details: ordersError }, { status: 500 })
    }

    // 检查用户积分记录
    const { data: userCredits, error: creditsError } = await supabase
      .from('user_credits')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(5)

    if (creditsError) {
      return NextResponse.json({ error: '查询用户积分失败', details: creditsError }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        recent_orders: paymentOrders,
        user_credits: userCredits,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      error: '调试API执行失败',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}