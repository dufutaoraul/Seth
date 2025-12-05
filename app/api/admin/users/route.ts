import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 注意：此API没有验证，仅通过前端密码保护
    // 生产环境建议添加API key验证

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

    // 获取所有用户信息（分页获取，确保获取所有用户）
    let allAuthUsers: any[] = []
    let page = 1
    const perPage = 1000 // 每页获取1000个用户

    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page: page,
        perPage: perPage
      })

      if (error) {
        console.error('获取用户列表失败:', error)
        break
      }

      if (!data || !data.users || data.users.length === 0) {
        break
      }

      allAuthUsers = allAuthUsers.concat(data.users)

      // 如果返回的用户数少于perPage，说明已经是最后一页
      if (data.users.length < perPage) {
        break
      }

      page++
    }

    if (allAuthUsers.length === 0) {
      return NextResponse.json({ users: [] })
    }

    // 获取所有用户的积分信息（按更新时间降序，确保获取最新记录）
    const { data: allCredits } = await supabaseAdmin
      .from('user_credits')
      .select('*')
      .order('updated_at', { ascending: false })

    // 合并用户信息和积分信息
    // 使用 Map 去重，确保每个用户只取最新的一条记录
    const creditsMap = new Map()
    allCredits?.forEach(c => {
      if (!creditsMap.has(c.user_id)) {
        creditsMap.set(c.user_id, c)
      }
    })

    const userInfoList = allAuthUsers.map(user => {
      const credits = creditsMap.get(user.id)

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

      // 计算剩余积分（使用计算值而非数据库存储值，确保准确）
      const calculatedRemaining = credits.total_credits - credits.used_credits

      return {
        user_id: user.id,
        email: user.email,
        current_membership: credits.current_membership,
        total_credits: credits.total_credits,
        used_credits: credits.used_credits,
        remaining_credits: calculatedRemaining, // 使用计算值
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