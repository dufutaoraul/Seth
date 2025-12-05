import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * 修复负积分用户的API
 * POST /api/payment/fix-negative-credits
 *
 * 请求体：
 * - email: 用户邮箱（可选，不提供则修复所有负积分用户）
 *
 * 处理逻辑：
 * - 将负积分用户的 total_credits 重置为 15（永久免费积分）
 * - 将 used_credits 清零
 * - 将 membership_expires_at 设为 null（免费积分永久有效）
 * - 将 current_membership 设为 '普通会员'
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { email } = body

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

    // 查找负积分用户
    let query = supabaseAdmin
      .from('user_credits')
      .select('*')

    // 如果指定了邮箱，先查找用户ID
    if (email) {
      const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers()

      if (userError) {
        return NextResponse.json({ error: '查询用户失败' }, { status: 500 })
      }

      const user = users.find(u => u.email === email)

      if (!user) {
        return NextResponse.json({ error: '用户不存在' }, { status: 404 })
      }

      query = query.eq('user_id', user.id)
    }

    const { data: allCredits, error: findError } = await query

    if (findError) {
      return NextResponse.json({ error: '查询积分记录失败', details: findError.message }, { status: 500 })
    }

    if (!allCredits || allCredits.length === 0) {
      return NextResponse.json({ error: '没有找到积分记录' }, { status: 404 })
    }

    // 筛选出负积分或已过期会员的用户
    const now = new Date()
    const usersToFix = allCredits.filter(credits => {
      const remainingCredits = credits.total_credits - credits.used_credits
      const isNegative = remainingCredits < 0
      const isExpiredPaidMember = credits.membership_expires_at &&
                                   new Date(credits.membership_expires_at) < now &&
                                   credits.current_membership !== '普通会员'

      return isNegative || isExpiredPaidMember
    })

    if (usersToFix.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有需要修复的用户',
        checked_count: allCredits.length
      })
    }

    // 修复这些用户
    const fixedUsers = []
    const errors = []

    for (const credits of usersToFix) {
      const oldRemainingCredits = credits.total_credits - credits.used_credits

      const { error: updateError } = await supabaseAdmin
        .from('user_credits')
        .update({
          total_credits: 15,          // 重置为15条永久免费积分
          used_credits: 0,            // 清零已使用积分
          current_membership: '普通会员',
          membership_expires_at: null  // 免费积分永久有效
        })
        .eq('user_id', credits.user_id)

      if (updateError) {
        errors.push({
          user_id: credits.user_id,
          error: updateError.message
        })
      } else {
        fixedUsers.push({
          user_id: credits.user_id,
          old_total_credits: credits.total_credits,
          old_used_credits: credits.used_credits,
          old_remaining_credits: oldRemainingCredits,
          old_membership: credits.current_membership,
          old_expires_at: credits.membership_expires_at,
          new_total_credits: 15,
          new_used_credits: 0,
          new_remaining_credits: 15,
          new_membership: '普通会员',
          new_expires_at: null
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `修复完成，成功修复 ${fixedUsers.length} 个用户`,
      fixed_users: fixedUsers,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('修复负积分错误:', error)
    return NextResponse.json({
      error: '服务器错误',
      details: error.message
    }, { status: 500 })
  }
}

// GET 方法：查询负积分用户
export async function GET(request: NextRequest) {
  try {
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

    // 获取所有积分记录
    const { data: allCredits, error: creditsError } = await supabaseAdmin
      .from('user_credits')
      .select('*')

    if (creditsError) {
      return NextResponse.json({ error: '查询积分记录失败' }, { status: 500 })
    }

    // 获取所有用户信息
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers()

    if (usersError) {
      return NextResponse.json({ error: '查询用户列表失败' }, { status: 500 })
    }

    // 筛选负积分用户
    const now = new Date()
    const negativeUsers = allCredits?.filter(credits => {
      const remainingCredits = credits.total_credits - credits.used_credits
      return remainingCredits < 0
    }).map(credits => {
      const user = users.find(u => u.id === credits.user_id)
      return {
        user_id: credits.user_id,
        email: user?.email || 'unknown',
        total_credits: credits.total_credits,
        used_credits: credits.used_credits,
        remaining_credits: credits.total_credits - credits.used_credits,
        current_membership: credits.current_membership,
        membership_expires_at: credits.membership_expires_at
      }
    }) || []

    // 筛选已过期但未重置的付费会员
    const expiredPaidMembers = allCredits?.filter(credits => {
      return credits.membership_expires_at &&
             new Date(credits.membership_expires_at) < now &&
             credits.current_membership !== '普通会员'
    }).map(credits => {
      const user = users.find(u => u.id === credits.user_id)
      return {
        user_id: credits.user_id,
        email: user?.email || 'unknown',
        total_credits: credits.total_credits,
        used_credits: credits.used_credits,
        remaining_credits: credits.total_credits - credits.used_credits,
        current_membership: credits.current_membership,
        membership_expires_at: credits.membership_expires_at
      }
    }) || []

    return NextResponse.json({
      negative_credits_users: negativeUsers,
      expired_paid_members: expiredPaidMembers,
      summary: {
        total_users: allCredits?.length || 0,
        negative_count: negativeUsers.length,
        expired_paid_count: expiredPaidMembers.length
      }
    })

  } catch (error: any) {
    console.error('查询负积分用户错误:', error)
    return NextResponse.json({
      error: '服务器错误',
      details: error.message
    }, { status: 500 })
  }
}
