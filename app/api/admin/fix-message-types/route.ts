import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * 修复消息类型的 API
 * GET - 检查有问题的消息
 * POST - 修复消息类型
 */

export async function GET(request: NextRequest) {
  try {
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

    // 查找缺少 message_type 或 message_type 异常的消息
    const { data: problematicMessages, error } = await supabaseAdmin
      .from('chat_messages')
      .select('id, session_id, message_type, content, created_at')
      .or('message_type.is.null,message_type.not.in.(user,assistant)')
      .limit(100)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 统计每个会话的消息类型分布
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('chat_sessions')
      .select('id, title')
      .limit(20)

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 })
    }

    const sessionStats = await Promise.all(
      (sessions || []).map(async (session) => {
        const { data: messages } = await supabaseAdmin
          .from('chat_messages')
          .select('message_type')
          .eq('session_id', session.id)

        const types = (messages || []).map(m => m.message_type)
        const uniqueTypes = [...new Set(types)]

        return {
          session_id: session.id,
          title: session.title,
          total_messages: messages?.length || 0,
          types_found: uniqueTypes,
          user_count: types.filter(t => t === 'user').length,
          assistant_count: types.filter(t => t === 'assistant').length,
          null_count: types.filter(t => t === null || t === undefined).length,
          other_count: types.filter(t => t !== 'user' && t !== 'assistant' && t !== null && t !== undefined).length,
        }
      })
    )

    return NextResponse.json({
      problematic_messages: problematicMessages,
      session_stats: sessionStats,
      summary: {
        problematic_count: problematicMessages?.length || 0,
        sessions_checked: sessionStats.length,
      }
    })

  } catch (error: any) {
    console.error('检查消息类型错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { sessionId, fix_all } = body

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

    let query = supabaseAdmin
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    const { data: messages, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ message: '没有找到消息' })
    }

    // 按会话分组
    const sessionMessages: { [key: string]: any[] } = {}
    messages.forEach(msg => {
      if (!sessionMessages[msg.session_id]) {
        sessionMessages[msg.session_id] = []
      }
      sessionMessages[msg.session_id].push(msg)
    })

    const fixedMessages: any[] = []
    const errors: any[] = []

    // 修复每个会话的消息
    for (const [sid, msgs] of Object.entries(sessionMessages)) {
      // 按时间排序
      msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

      for (let i = 0; i < msgs.length; i++) {
        const msg = msgs[i]
        const expectedType = i % 2 === 0 ? 'user' : 'assistant'

        // 检查是否需要修复
        if (!msg.message_type || msg.message_type !== expectedType) {
          if (!fix_all && msg.message_type) {
            // 如果有类型且不是 fix_all 模式，跳过
            continue
          }

          // 修复消息类型
          const { error: updateError } = await supabaseAdmin
            .from('chat_messages')
            .update({ message_type: expectedType })
            .eq('id', msg.id)

          if (updateError) {
            errors.push({
              id: msg.id,
              error: updateError.message,
            })
          } else {
            fixedMessages.push({
              id: msg.id,
              session_id: sid,
              old_type: msg.message_type,
              new_type: expectedType,
              content_preview: msg.content?.substring(0, 50),
            })
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `修复完成，共修复 ${fixedMessages.length} 条消息`,
      fixed_messages: fixedMessages,
      errors: errors.length > 0 ? errors : undefined,
    })

  } catch (error: any) {
    console.error('修复消息类型错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
