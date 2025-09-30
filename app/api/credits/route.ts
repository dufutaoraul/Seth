import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 强制动态路由，禁用所有缓存
export const dynamic = 'force-dynamic'
export const revalidate = 0

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  try {
    // 从请求头获取授权信息
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '缺少授权头' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // 使用service role key绕过RLS，直接访问数据
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 先用anon key验证用户token
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    console.log('Credits API - User authenticated:', user.email)

    // 使用admin客户端获取用户积分，绕过RLS
    const { data: userCredits, error: creditsError } = await supabaseAdmin
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (creditsError && creditsError.code !== 'PGRST116') {
      console.error('获取用户积分失败:', creditsError)
      return NextResponse.json(
        { error: '获取用户积分失败' },
        { status: 500 }
      )
    }

    // 如果没有积分记录，创建默认积分
    if (!userCredits) {
      const { data: newCredits, error: createCreditsError } = await supabaseAdmin
        .from('user_credits')
        .insert([{
          user_id: user.id,
          total_credits: 15,
          used_credits: 0,
          current_membership: '普通会员'
        }])
        .select()
        .single()

      if (createCreditsError) {
        console.error('创建用户积分失败:', createCreditsError)
        return NextResponse.json(
          { error: '创建用户积分失败' },
          { status: 500 }
        )
      }

      console.log('为新用户创建积分记录:', newCredits)

      return NextResponse.json({
        credits: {
          ...newCredits,
          remaining_credits: newCredits.total_credits - newCredits.used_credits
        }
      })
    } else {
      // 计算剩余积分
      const remaining_credits = userCredits.total_credits - userCredits.used_credits

      console.log('用户积分信息:', {
        total: userCredits.total_credits,
        used: userCredits.used_credits,
        remaining: remaining_credits,
        membership: userCredits.current_membership
      })

      return NextResponse.json({
        credits: {
          ...userCredits,
          remaining_credits
        }
      })
    }

  } catch (error) {
    console.error('Credits API error:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}