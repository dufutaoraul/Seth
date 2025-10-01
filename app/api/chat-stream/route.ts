import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendMessageToDifyStreaming } from '@/lib/dify'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, conversationId, sessionId } = body

    if (!message) {
      return new Response('缺少消息内容', { status: 400 })
    }

    // 验证用户
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('未授权', { status: 401 })
    }

    const token = authHeader.substring(7)
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response('未授权', { status: 401 })
    }

    // 使用管理员权限检查积分
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { data: userCredits } = await supabaseAdmin
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!userCredits || userCredits.remaining_credits < 1) {
      return new Response('积分不足', { status: 402 })
    }

    // 检查并处理会员过期
    const now = new Date()
    if (userCredits.membership_expires_at) {
      const expireDate = new Date(userCredits.membership_expires_at)
      if (expireDate <= now) {
        await supabaseAdmin.from('user_credits').update({
          total_credits: 15,
          used_credits: 0,
          current_membership: '普通会员',
          membership_expires_at: null,
        }).eq('user_id', user.id)
      }
    }

    // 创建或获取会话ID
    let actualSessionId = sessionId
    if (!actualSessionId) {
      const { data: newSession } = await supabase
        .from('chat_sessions')
        .insert([{
          user_id: user.id,
          title: message.slice(0, 20) + (message.length > 20 ? '...' : ''),
        }])
        .select()
        .single()

      if (newSession) {
        actualSessionId = newSession.id
      }
    }

    // 调用 Dify 流式 API
    const difyResponse = await sendMessageToDifyStreaming(message, user.id, conversationId)

    // 创建流式响应
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const reader = difyResponse.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }

        const decoder = new TextDecoder()
        let buffer = ''
        let fullAnswer = ''
        let difyConversationId = ''
        let difyMessageId = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (!line.trim() || !line.startsWith('data: ')) continue

              const data = line.slice(6)
              if (data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)

                // agent_thought 事件：AI思考过程
                if (parsed.event === 'agent_thought') {
                  // 可以显示思考过程，暂时忽略
                }
                // message 事件：保存完整答案但不发送（避免闪烁）
                else if (parsed.event === 'message') {
                  if (parsed.answer) {
                    fullAnswer = parsed.answer
                  }
                }
                // message_end 事件：消息结束，发送完整答案
                else if (parsed.event === 'message_end') {
                  difyConversationId = parsed.conversation_id
                  difyMessageId = parsed.id

                  // 确保有最终答案
                  if (parsed.answer) {
                    fullAnswer = parsed.answer
                  }

                  // 只在结束时发送一次完整答案到前端
                  if (fullAnswer) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      type: 'content',
                      content: fullAnswer
                    })}\n\n`))
                  }
                }
              } catch (e) {
                console.error('解析SSE数据失败:', e)
              }
            }
          }

          // 扣除积分
          await supabaseAdmin
            .from('user_credits')
            .update({ used_credits: userCredits.used_credits + 1 })
            .eq('user_id', user.id)

          // 保存消息到数据库
          if (actualSessionId) {
            await supabase.from('chat_messages').insert([
              {
                session_id: actualSessionId,
                user_id: user.id,
                message_type: 'user',
                content: message,
              },
              {
                session_id: actualSessionId,
                user_id: user.id,
                message_type: 'assistant',
                content: fullAnswer,
                dify_conversation_id: difyConversationId,
                dify_message_id: difyMessageId,
              },
            ])
          }

          // 发送完成信号
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'done',
            sessionId: actualSessionId,
            conversationId: difyConversationId,
            remainingCredits: userCredits.remaining_credits - 1
          })}\n\n`))

        } catch (error) {
          console.error('流式处理错误:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: '处理失败'
          })}\n\n`))
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error: any) {
    console.error('Chat stream API error:', error)
    return new Response(error.message || '服务器错误', { status: 500 })
  }
}
