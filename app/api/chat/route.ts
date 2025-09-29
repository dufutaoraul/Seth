import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendMessageToDify } from '@/lib/dify'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, conversationId } = await request.json()

    if (!message || !sessionId) {
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

    const token = authHeader.substring(7) // 移除 'Bearer ' 前缀

    // 创建 Supabase 客户端并设置会话
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // 验证用户身份
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

    // 检查用户积分
    const { data: userCredits, error: creditsError } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (creditsError || !userCredits || userCredits.remaining_credits < 1) {
      return NextResponse.json(
        { error: '积分不足' },
        { status: 403 }
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
        { error: '会话不存在' },
        { status: 404 }
      )
    }

    // 保存用户消息
    const { data: userMessage, error: userMessageError } = await supabase
      .from('chat_messages')
      .insert([
        {
          session_id: sessionId,
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

    // 调用Dify API
    let difyResponse
    try {
      difyResponse = await sendMessageToDify(message, user.id, conversationId)
    } catch (difyError: any) {
      console.error('Dify API调用失败:', difyError)
      return NextResponse.json(
        { error: difyError.message || '与AI服务连接失败' },
        { status: 500 }
      )
    }

    // 保存AI回复
    const { data: assistantMessage, error: assistantMessageError } = await supabase
      .from('chat_messages')
      .insert([
        {
          session_id: sessionId,
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

    // 扣除积分
    const { data: consumeResult, error: consumeError } = await supabase
      .rpc('consume_user_credit', {
        p_user_id: user.id,
        p_session_id: sessionId,
        p_message_id: assistantMessage.id,
      })

    if (consumeError || !consumeResult) {
      console.error('扣除积分失败:', consumeError)
      return NextResponse.json(
        { error: '积分扣除失败' },
        { status: 500 }
      )
    }

    // 获取更新后的积分信息
    const { data: updatedCredits } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // 更新会话时间
    await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId)

    return NextResponse.json({
      userMessage,
      assistantMessage,
      updatedCredits,
      difyConversationId: difyResponse.conversation_id,
    })
  } catch (error) {
    console.error('聊天API错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}