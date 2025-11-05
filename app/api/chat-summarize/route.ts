import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendMessageToDify } from '@/lib/dify'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * 生成对话总结API
 * - 不消耗用户积分（系统功能）
 * - 生成约300字的对话总结
 * - 标记会话为已总结、只读
 * - 创建新会话并包含总结内容
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json({ error: '缺少会话ID' }, { status: 400 })
    }

    // 验证用户
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
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
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 验证会话所有权
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: '会话不存在' }, { status: 404 })
    }

    // 检查是否已总结
    if (session.is_summarized) {
      return NextResponse.json({
        error: '会话已总结',
        summary: session.summary_content
      }, { status: 400 })
    }

    // 获取会话的所有消息
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (messagesError || !messages || messages.length === 0) {
      return NextResponse.json({ error: '无法获取消息历史' }, { status: 500 })
    }

    // 构建对话历史文本
    let conversationText = ''
    messages.forEach((msg) => {
      const speaker = msg.message_type === 'user' ? '用户' : '赛斯'
      conversationText += `${speaker}: ${msg.content}\n\n`
    })

    // 构建总结提示词
    const summaryPrompt = `请对以下对话进行简明扼要的总结，总结长度控制在300字以内。重点提炼：
1. 用户主要关心的问题或主题
2. 赛斯给出的核心观点和建议
3. 对话中的关键要点

对话内容：
${conversationText}

请用简洁明了的语言总结，便于用户快速回顾对话要点。`

    console.log('🤖 开始生成总结...')

    // ⭐ 调用 Dify API 生成总结（不消耗用户积分）
    const summaryResponse = await sendMessageToDify(summaryPrompt, user.id)

    if (!summaryResponse.answer) {
      throw new Error('总结生成失败')
    }

    const summaryContent = summaryResponse.answer.trim()
    console.log(`✅ 总结生成成功，长度: ${summaryContent.length} 字`)

    // 标记旧会话为已总结、只读
    await supabaseAdmin
      .from('chat_sessions')
      .update({
        is_summarized: true,
        summary_content: summaryContent,
        is_readonly: true,
      })
      .eq('id', sessionId)

    // 创建新会话，标题包含"续："前缀，并包含总结
    const newSessionTitle = `续：${session.title.replace(/^续：/, '')}`
    const { data: newSession, error: newSessionError } = await supabaseAdmin
      .from('chat_sessions')
      .insert([{
        user_id: user.id,
        title: newSessionTitle,
      }])
      .select()
      .single()

    if (newSessionError || !newSession) {
      throw new Error('创建新会话失败')
    }

    // 在新会话中添加总结作为第一条系统消息
    await supabaseAdmin
      .from('chat_messages')
      .insert([{
        session_id: newSession.id,
        user_id: user.id,
        message_type: 'assistant',
        content: `📝 **上一轮对话总结**\n\n${summaryContent}\n\n---\n\n现在开始新一轮对话，有什么我可以帮助你的吗？`,
      }])

    console.log(`🎉 总结完成，新会话ID: ${newSession.id}`)

    return NextResponse.json({
      success: true,
      summary: summaryContent,
      oldSessionId: sessionId,
      newSessionId: newSession.id,
      newSessionTitle: newSessionTitle,
    })

  } catch (error: any) {
    console.error('总结API错误:', error)
    return NextResponse.json(
      { error: error.message || '生成总结失败' },
      { status: 500 }
    )
  }
}
