import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ChatInterface from '@/components/ChatInterface'

export default async function SimpleChatPage() {
  const supabase = createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  console.log('Simple Chat page - User:', user ? 'Found' : 'Not found', authError ? `Error: ${authError.message}` : '')

  if (!user) {
    console.log('No user found, redirecting to home')
    redirect('/')
  }

  // 创建默认的用户积分信息（不依赖数据库）
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

  return (
    <ChatInterface
      user={user}
      userCredits={defaultCredits}
      sessions={[]}
    />
  )
}