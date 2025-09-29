import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendMessageToDify } from '@/lib/dify'

// 强制动态路由
export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, conversationId } = await request.json()

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
    console.log('Request body:', { message, sessionId, conversationId })

    // 如果没有提供sessionId，创建新的会话
    let actualSessionId = sessionId
    if (!actualSessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert([
          {
            user_id: user.id,
            title: message.slice(0, 20) + (message.length > 20 ? '...' : ''),
          },
        ])
        .select()
        .single()

      if (sessionError) {
        console.error('创建会话失败:', sessionError)
        return NextResponse.json(
          { error: '创建会话失败' },
          { status: 500 }
        )
      }

      actualSessionId = newSession.id
      console.log('创建新会话:', actualSessionId)
    } else {
      // 验证会话所有权
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', actualSessionId)
        .eq('user_id', user.id)
        .single()

      if (sessionError || !session) {
        console.error('会话验证失败:', sessionError)
        return NextResponse.json(
          { error: '会话不存在或无权访问' },
          { status: 404 }
        )
      }
    }

    // 保存用户消息
    const { data: userMessage, error: userMessageError } = await supabase
      .from('chat_messages')
      .insert([
        {
          session_id: actualSessionId,
          user_id: user.id,
          message_type: 'user',
          content: message,
          tokens_used: 0,
        },
      ])
      .select()
      .single()

    if (userMessageError) {
      console.error('保存用户消息失败:', userMessageError)
      return NextResponse.json(
        { error: '保存消息失败' },
        { status: 500 }
      )
    }

    console.log('保存用户消息成功:', userMessage.id)

    // 调用 Dify API
    let difyResponse
    try {
      console.log('调用Dify API，消息:', message)
      difyResponse = await sendMessageToDify(message, user.id, conversationId)
      console.log('Dify API响应成功')
    } catch (difyError: any) {
      console.error('Dify API调用失败:', difyError)
      return NextResponse.json(
        { error: difyError.message || 'AI服务暂时不可用' },
        { status: 500 }
      )
    }

    // 保存AI回复
    const { data: assistantMessage, error: assistantMessageError } = await supabase
      .from('chat_messages')
      .insert([
        {
          session_id: actualSessionId,
          user_id: user.id,
          message_type: 'assistant',
          content: difyResponse.answer,
          dify_conversation_id: difyResponse.conversation_id,
          dify_message_id: difyResponse.message_id,
          tokens_used: 1, // 假设每次对话消耗1个积分
        },
      ])
      .select()
      .single()

    if (assistantMessageError) {
      console.error('保存AI消息失败:', assistantMessageError)
      return NextResponse.json(
        { error: '保存AI回复失败' },
        { status: 500 }
      )
    }

    console.log('保存AI消息成功:', assistantMessage.id)

    // 更新会话时间
    await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', actualSessionId)

    // 返回完整响应
    return NextResponse.json({
      userMessage,
      assistantMessage,
      sessionId: actualSessionId,
      conversationId: difyResponse.conversation_id,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: '服务器内部错误', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}