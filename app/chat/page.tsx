import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ChatInterface from '@/components/ChatInterface'

export default async function ChatPage() {
  const supabase = createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  console.log('Chat page - User:', user ? 'Found' : 'Not found', authError ? `Error: ${authError.message}` : '')

  if (!user) {
    console.log('No user found, redirecting to home')
    redirect('/')
  }

  // 获取用户积分信息（如果表不存在，提供默认值）
  const { data: userCredits, error: creditsError } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', user.id)
    .single()

  console.log('User credits:', userCredits, creditsError ? `Error: ${creditsError.message}` : '')

  // 如果积分记录不存在，创建默认记录或使用默认值
  const defaultCredits = {
    id: 'temp',
    user_id: user.id,
    total_credits: 15,
    used_credits: 0,
    remaining_credits: 15,
    current_membership: '免费用户',
    membership_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // 获取用户的聊天会话
  const { data: sessions, error: sessionsError } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  console.log('Sessions:', sessions?.length || 0, sessionsError ? `Error: ${sessionsError.message}` : '')

  return (
    <ChatInterface
      user={user}
      userCredits={userCredits || defaultCredits}
      sessions={sessions || []}
    />
  )
}