import { createServerSupabaseClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import HomePage from '@/components/HomePage'

export default async function Home() {
  const supabase = createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 如果用户已登录，跳转到聊天页面
  if (user) {
    redirect('/chat')
  }

  return <HomePage />
}