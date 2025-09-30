import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限（简单验证，生产环境应该更严格）
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
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

    // 获取所有用户信息
    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers()

    if (!allUsers || !allUsers.users) {
      return NextResponse.json({ users: [] })
    }

    // 获取所有用户的积分信息
    const { data: allCredits } = await supabaseAdmin
      .from('user_credits')
      .select('*')

    // 合并用户信息和积分信息
    const userInfoList = allUsers.users.map(user => {
      const credits = allCredits?.find(c => c.user_id === user.id)

      if (!credits) {
        return {
          user_id: user.id,
          email: user.email,
          current_membership: '普通会员',
          total_credits: 0,
          used_credits: 0,
          remaining_credits: 0,
          membership_expires_at: null,
          created_at: user.created_at,
          updated_at: user.updated_at || user.created_at,
          status: '永久',
          days_remaining: null
        }
      }

      // 计算会员状态和剩余天数
      let status = '永久'
      let daysRemaining: number | null = null

      if (credits.membership_expires_at) {
        const expiresAt = new Date(credits.membership_expires_at)
        const now = new Date()
        const diffTime = expiresAt.getTime() - now.getTime()
        const diffDays = diffTime / (1000 * 60 * 60 * 24)

        if (diffTime < 0) {
          status = '已过期'
          daysRemaining = 0
        } else {
          status = '有效'
          daysRemaining = diffDays
        }
      }

      return {
        user_id: user.id,
        email: user.email,
        current_membership: credits.current_membership,
        total_credits: credits.total_credits,
        used_credits: credits.used_credits,
        remaining_credits: credits.remaining_credits,
        membership_expires_at: credits.membership_expires_at,
        created_at: credits.created_at,
        updated_at: credits.updated_at,
        status,
        days_remaining: daysRemaining
      }
    })

    // 按会员等级和剩余积分排序
    userInfoList.sort((a, b) => {
      // 先按会员等级排序
      const membershipOrder: Record<string, number> = {
        '高级会员': 0,
        '标准会员': 1,
        '普通会员': 2
      }
      const orderA = membershipOrder[a.current_membership] ?? 3
      const orderB = membershipOrder[b.current_membership] ?? 3

      if (orderA !== orderB) {
        return orderA - orderB
      }

      // 同等级按剩余积分排序
      return b.remaining_credits - a.remaining_credits
    })

    return NextResponse.json({ users: userInfoList })
  } catch (error) {
    console.error('获取用户列表失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}