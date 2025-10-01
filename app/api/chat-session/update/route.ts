import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, title } = body

    if (!sessionId || !title) {
      return NextResponse.json(
        { error: '缺少必要参数' },
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

    // 创建 Supabase 客户端并设置认证上下文
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

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

    // 验证会话所有权并更新标题
    const { data: session, error: updateError } = await supabase
      .from('chat_sessions')
      .update({ title: title.trim() })
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('更新会话标题失败:', updateError)
      return NextResponse.json(
        { error: '更新失败' },
        { status: 500 }
      )
    }

    if (!session) {
      return NextResponse.json(
        { error: '会话不存在或无权访问' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      session
    })
  } catch (error) {
    console.error('Update session API error:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
