import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import PaymentSuccessPage from '@/components/PaymentSuccessPage'

export default async function PaymentSuccess() {
  const supabase = createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // 获取最新的积分信息
  const { data: userCredits } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return <PaymentSuccessPage user={user} userCredits={userCredits} />
}