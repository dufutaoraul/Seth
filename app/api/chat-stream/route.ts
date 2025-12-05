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

    let { data: userCredits } = await supabaseAdmin
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // ⭐ 优先检查并处理会员过期（在积分检查之前！）
    const now = new Date()
    let membershipExpired = false
    if (userCredits && userCredits.membership_expires_at && userCredits.current_membership !== '普通会员') {
      const expireDate = new Date(userCredits.membership_expires_at)
      if (expireDate <= now) {
        membershipExpired = true
        // 付费会员过期：清零所有积分，重置为15条永久免费积分
        console.log('⚠️ 付费会员已过期，重置积分:', {
          user_id: user.id,
          old_membership: userCredits.current_membership,
          old_total: userCredits.total_credits,
          old_used: userCredits.used_credits,
        })

        const { data: resetCredits } = await supabaseAdmin
          .from('user_credits')
          .update({
            total_credits: 15,
            used_credits: 0,
            current_membership: '普通会员',
            membership_expires_at: null,
          })
          .eq('user_id', user.id)
          .select()
          .single()

        // 更新 userCredits 为重置后的值
        if (resetCredits) {
          userCredits = resetCredits
        }
      }
    }

    // ⭐ 计算实际剩余积分（防止负数情况）
    const actualRemainingCredits = userCredits ? Math.max(0, userCredits.total_credits - userCredits.used_credits) : 0

    if (!userCredits || actualRemainingCredits < 1) {
      // 返回带有会员到期信息的响应
      return new Response(JSON.stringify({
        error: '积分不足',
        membershipExpired: membershipExpired,
        message: membershipExpired
          ? '您的会员已到期，积分已重置为15条。当前积分不足，请充值或稍后再试。'
          : '积分不足，请充值后继续使用。'
      }), {
        status: 402,
        headers: { 'Content-Type': 'application/json' }
      })
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

    // ⭐ 检查会话是否已总结（只读）
    if (actualSessionId) {
      const { data: sessionData } = await supabaseAdmin
        .from('chat_sessions')
        .select('is_readonly, is_summarized')
        .eq('id', actualSessionId)
        .single()

      if (sessionData?.is_readonly) {
        return new Response('此对话已总结完成，不可继续。请创建新对话。', { status: 403 })
      }
    }

    // ⭐ 计算当前会话的轮数（user消息数 = 轮数）
    let currentRoundCount = 0
    if (actualSessionId) {
      const { data: userMessages } = await supabaseAdmin
        .from('chat_messages')
        .select('id')
        .eq('session_id', actualSessionId)
        .eq('message_type', 'user')

      currentRoundCount = userMessages?.length || 0
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
                console.log('📨 Dify事件:', parsed.event)

                // ⭐ 打印所有非message事件的完整内容
                if (parsed.event !== 'message' && parsed.event !== 'agent_message') {
                  console.log('🔔 特殊事件完整内容:', JSON.stringify(parsed, null, 2))
                }

                // agent_thought 事件：AI思考过程
                if (parsed.event === 'agent_thought') {
                  // 可以显示思考过程，暂时忽略
                  console.log('💭 AI思考中...')
                }
                // message 事件：Dify返回增量内容（每次answer是新增的部分）
                else if (parsed.event === 'message') {
                  if (parsed.answer) {
                    // Dify的answer本身就是增量，直接累加并发送
                    fullAnswer += parsed.answer

                    // 直接发送增量内容到前端
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      type: 'delta',
                      content: parsed.answer
                    })}\n\n`))
                  }
                }
                // agent_message 事件：智能助手模式的消息（也是增量）
                else if (parsed.event === 'agent_message') {
                  if (parsed.answer) {
                    fullAnswer += parsed.answer

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      type: 'delta',
                      content: parsed.answer
                    })}\n\n`))
                  }
                }
                // message_end 事件：消息结束
                else if (parsed.event === 'message_end') {
                  difyConversationId = parsed.conversation_id
                  difyMessageId = parsed.id

                  // ⭐⭐⭐ 检测 Token 信息（message_end 是最后一个事件）⭐⭐⭐
                  console.log('========================================')
                  console.log('🏁 message_end 事件（最后一个事件）')
                  console.log('完整事件内容:', JSON.stringify(parsed, null, 2))
                  console.log('========================================')

                  // 检查各种可能的 Token 字段
                  if (parsed.metadata?.usage) {
                    console.log('✅✅✅ 发现 metadata.usage 字段！')
                    console.log(JSON.stringify(parsed.metadata.usage, null, 2))
                  }
                  if (parsed.usage) {
                    console.log('✅✅✅ 发现 usage 字段！')
                    console.log(JSON.stringify(parsed.usage, null, 2))
                  }
                  if (parsed.metadata) {
                    console.log('✅ 发现 metadata 字段:', JSON.stringify(parsed.metadata, null, 2))
                  }
                  if (!parsed.metadata?.usage && !parsed.usage && !parsed.metadata) {
                    console.log('❌ message_end 事件中未发现 Token 统计信息')
                  }
                }
              } catch (e) {
                console.error('解析SSE数据失败:', e)
              }
            }
          }

          // ⭐ 扣除积分（带安全检查，防止负数）
          // 先重新获取最新积分状态，防止并发问题
          const { data: latestCredits } = await supabaseAdmin
            .from('user_credits')
            .select('*')
            .eq('user_id', user.id)
            .single()

          if (latestCredits) {
            const currentRemaining = latestCredits.total_credits - latestCredits.used_credits
            // 只有在剩余积分大于0时才扣减
            if (currentRemaining > 0) {
              await supabaseAdmin
                .from('user_credits')
                .update({ used_credits: latestCredits.used_credits + 1 })
                .eq('user_id', user.id)
            } else {
              console.warn('⚠️ 积分不足，跳过扣减:', {
                user_id: user.id,
                total: latestCredits.total_credits,
                used: latestCredits.used_credits,
                remaining: currentRemaining
              })
            }
          }

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

          // ⭐ 计算新的轮数（加上刚刚发送的这一轮）
          const newRoundCount = currentRoundCount + 1
          console.log(`📊 当前对话轮数: ${newRoundCount}`)

          // ⭐ 检查是否需要警告或触发总结
          let roundWarning = null
          if (newRoundCount >= 45 && newRoundCount < 50) {
            roundWarning = {
              roundCount: newRoundCount,
              limit: 50,
              message: `当前对话已进行 ${newRoundCount} 轮，到50轮对话时由于逼近大模型上下文限制，将会触发自动总结打包，不可再更改哦。`
            }
          } else if (newRoundCount >= 50) {
            // 达到50轮，前端需要强制总结
            roundWarning = {
              roundCount: newRoundCount,
              limit: 50,
              mustSummarize: true,
              message: `对话已达到 ${newRoundCount} 轮，已触发自动总结。`
            }
          }

          // 发送完成信号
          // 计算正确的剩余积分（使用最新数据）
          const finalRemaining = latestCredits
            ? Math.max(0, latestCredits.total_credits - latestCredits.used_credits - 1)
            : actualRemainingCredits - 1

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'done',
            sessionId: actualSessionId,
            conversationId: difyConversationId,
            remainingCredits: Math.max(0, finalRemaining), // 确保不返回负数
            roundCount: newRoundCount,
            roundWarning: roundWarning
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
