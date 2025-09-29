import { type NextRequest } from 'next/server'
import { createMiddlewareSupabaseClient } from '@/lib/supabase-server'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareSupabaseClient(request)

  // 刷新会话
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}