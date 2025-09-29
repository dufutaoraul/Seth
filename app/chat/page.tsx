import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ChatInterface from '@/components/ChatInterface'

export default async function ChatPage() {
  const supabase = createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // 获取用户积分信息
  const { data: userCredits } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // 获取用户的聊天会话
  const { data: sessions } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  return (
    <ChatInterface
      user={user}
      userCredits={userCredits}
      sessions={sessions || []}
    />
  )
}