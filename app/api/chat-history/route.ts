import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: '缺少会话ID' },
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

    // 创建 Supabase 客户端并验证用户
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
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

    // 验证会话所有权
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: '会话不存在或无权访问' },
        { status: 404 }
      )
    }

    // 获取聊天消息
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('获取聊天消息失败:', messagesError)
      return NextResponse.json(
        { error: '获取聊天历史失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      session,
      messages: messages || []
    })
  } catch (error) {
    console.error('Chat history API error:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

// 获取用户的所有聊天会话
export async function POST(request: NextRequest) {
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

    // 创建 Supabase 客户端并验证用户
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
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

    // 获取用户的所有聊天会话
    const { data: sessions, error: sessionsError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (sessionsError) {
      console.error('获取聊天会话失败:', sessionsError)
      return NextResponse.json(
        { error: '获取聊天会话失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      sessions: sessions || []
    })
  } catch (error) {
    console.error('Chat sessions API error:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}