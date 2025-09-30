import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0 // 禁用缓存

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: '需要提供邮箱参数' }, { status: 400 })
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

    // 查询用户的积分信息
    const { data: credits } = await supabaseAdmin
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // 查询最近的订单
    const { data: orders } = await supabaseAdmin
      .from('payment_orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      credits,
      recent_orders: orders,
    })
  } catch (error) {
    console.error('检查订单错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}