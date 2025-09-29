import { createServerSupabaseClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import MembershipPage from '@/components/MembershipPage'

export default async function Membership() {
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

  // 获取用户的支付记录
  const { data: paymentHistory } = await supabase
    .from('payment_orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <MembershipPage
      user={user}
      userCredits={userCredits}
      paymentHistory={paymentHistory || []}
    />
  )
}