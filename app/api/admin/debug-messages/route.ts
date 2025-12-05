import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// 诊断 API：检查消息存储格式
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const limit = parseInt(searchParams.get('limit') || '50')

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

    // 如果指定了 sessionId，获取该会话的消息
    if (sessionId) {
      const { data: messages, error } = await supabaseAdmin
        .from('chat_messages')
        .select('id, session_id, user_id, message_type, content, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(limit)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // 分析消息格式
      const analysis = {
        total_messages: messages?.length || 0,
        user_messages: messages?.filter(m => m.message_type === 'user').length || 0,
        assistant_messages: messages?.filter(m => m.message_type === 'assistant').length || 0,
        other_types: messages?.filter(m => m.message_type !== 'user' && m.message_type !== 'assistant').length || 0,
        message_types_found: Array.from(new Set(messages?.map(m => m.message_type) || [])),
      }

      // 返回消息详情（截断内容以便查看）
      const messagesPreview = messages?.map(m => ({
        id: m.id,
        message_type: m.message_type,
        content_preview: m.content?.substring(0, 100) + (m.content?.length > 100 ? '...' : ''),
        content_length: m.content?.length || 0,
        created_at: m.created_at,
      }))

      return NextResponse.json({
        analysis,
        messages: messagesPreview,
      })
    }

    // 否则，获取最近的会话和消息统计
    const { data: recentSessions, error: sessionsError } = await supabaseAdmin
      .from('chat_sessions')
      .select('id, title, user_id, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10)

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 })
    }

    // 获取每个会话的消息统计
    const sessionsWithStats = await Promise.all(
      (recentSessions || []).map(async (session) => {
        const { data: messages } = await supabaseAdmin
          .from('chat_messages')
          .select('message_type')
          .eq('session_id', session.id)

        return {
          ...session,
          message_stats: {
            total: messages?.length || 0,
            user: messages?.filter(m => m.message_type === 'user').length || 0,
            assistant: messages?.filter(m => m.message_type === 'assistant').length || 0,
            other: messages?.filter(m => m.message_type !== 'user' && m.message_type !== 'assistant').length || 0,
          }
        }
      })
    )

    return NextResponse.json({
      recent_sessions: sessionsWithStats,
    })

  } catch (error: any) {
    console.error('诊断 API 错误:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
