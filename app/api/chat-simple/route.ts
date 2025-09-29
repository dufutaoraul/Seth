import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendMessageToDify } from '@/lib/dify'

// 强制动态路由
export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    console.log('=== Chat Simple API 调用开始 ===')
    const { message, conversationId, sessionId } = await request.json()
    console.log('请求参数:', { message, conversationId, sessionId })

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

    // 检查用户积分
    const { data: userCredits, error: creditsError } = await supabase
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
      const { data: newCredits, error: createCreditsError } = await supabase
        .from('user_credits')
        .insert([{ user_id: user.id, total_credits: 15, used_credits: 0 }])
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
    } else {
      // 检查积分是否足够
      const remainingCredits = userCredits.total_credits - userCredits.used_credits
      if (remainingCredits < 1) {
        console.log('用户积分不足:', remainingCredits)
        return NextResponse.json(
          { error: '积分不足，请购买会员' },
          { status: 402 }
        )
      }
      console.log('用户当前剩余积分:', remainingCredits)
    }

    // 如果没有sessionId，创建一个新的会话
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
      } else {
        actualSessionId = newSession.id
        console.log('创建新会话:', actualSessionId)
      }
    }

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

    // 如果创建了会话，保存聊天记录
    if (actualSessionId) {
      try {
        console.log('开始保存聊天记录，会话ID:', actualSessionId)

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
          throw userMessageError
        }
        console.log('用户消息已保存:', userMessage)

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
              tokens_used: 1,
            },
          ])
          .select()
          .single()

        if (assistantMessageError) {
          console.error('保存AI消息失败:', assistantMessageError)
          throw assistantMessageError
        }
        console.log('AI消息已保存:', assistantMessage)

        // 更新会话时间
        const { error: updateError } = await supabase
          .from('chat_sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', actualSessionId)

        if (updateError) {
          console.error('更新会话时间失败:', updateError)
        } else {
          console.log('会话时间已更新')
        }

        console.log('聊天记录已成功保存到数据库')
      } catch (dbError) {
        console.error('保存聊天记录失败:', dbError)
        // 不影响聊天功能，继续返回结果
      }
    } else {
      console.log('没有会话ID，跳过保存聊天记录')
    }

    // 扣除用户积分
    try {
      const { error: creditUpdateError } = await supabase
        .from('user_credits')
        .update({
          used_credits: userCredits ? userCredits.used_credits + 1 : 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (creditUpdateError) {
        console.error('扣除积分失败:', creditUpdateError)
      } else {
        console.log('成功扣除1积分')
      }
    } catch (creditError) {
      console.error('积分操作失败:', creditError)
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
      sessionId: actualSessionId,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}