import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import HomePage from '@/components/HomePage'

export default async function Home() {
  const supabase = createServerSupabaseClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  console.log('Home page - User check:', user ? 'Found' : 'Not found', error ? `Error: ${error.message}` : '')

  // 如果用户已登录，跳转到聊天页面
  if (user) {
    console.log('User found, redirecting to chat')
    redirect('/chat')
  }

  return <HomePage />
}