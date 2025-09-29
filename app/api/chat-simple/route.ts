import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendMessageToDify } from '@/lib/dify'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const { message, conversationId } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: '缺少消息内容' },
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

    console.log('Chat API - User authenticated:', user.email)

    // 调用 Dify API
    let difyResponse
    try {
      console.log('Calling Dify API with message:', message)
      difyResponse = await sendMessageToDify(message, user.id, conversationId)
      console.log('Dify response received:', difyResponse)
    } catch (difyError: any) {
      console.error('Dify API error:', difyError)
      return NextResponse.json(
        { error: difyError.message || 'AI服务暂时不可用' },
        { status: 500 }
      )
    }

    // 返回简化的响应
    return NextResponse.json({
      userMessage: {
        id: `user-${Date.now()}`,
        content: message,
        message_type: 'user',
        created_at: new Date().toISOString(),
      },
      assistantMessage: {
        id: `assistant-${Date.now()}`,
        content: difyResponse.answer,
        message_type: 'assistant',
        created_at: new Date().toISOString(),
        dify_conversation_id: difyResponse.conversation_id,
        dify_message_id: difyResponse.message_id,
      },
      conversationId: difyResponse.conversation_id,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}