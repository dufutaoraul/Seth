import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// 客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 服务端客户端
export function createServerSupabaseClient() {
  const cookieStore = cookies()

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get: (name: string) => {
          return cookieStore.get(name)?.value
        },
        set: (name: string, value: string, options: any) => {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            console.error('Failed to set cookie:', error)
          }
        },
        remove: (name: string, options: any) => {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            console.error('Failed to remove cookie:', error)
          }
        },
      },
    }
  )
}

// 管理员客户端（用于服务端操作）
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// 数据库类型定义
export interface UserCredits {
  id: string
  user_id: string
  total_credits: number
  used_credits: number
  remaining_credits: number
  current_membership: string
  membership_expires_at: string
  created_at: string
  updated_at: string
}

export interface ChatSession {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  user_id: string
  message_type: 'user' | 'assistant'
  content: string
  dify_conversation_id?: string
  dify_message_id?: string
  tokens_used: number
  created_at: string
}

export interface PaymentOrder {
  id: string
  user_id: string
  order_no: string
  membership_type: string
  amount_yuan: number
  credits_to_add: number
  payment_method: string
  payment_status: 'pending' | 'paid' | 'failed' | 'cancelled'
  zpay_trade_no?: string
  zpay_response?: string
  paid_at?: string
  created_at: string
  updated_at: string
}