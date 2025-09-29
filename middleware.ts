import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 简单的middleware，只是透传请求
  return NextResponse.next()
}

export const config = {
  matcher: [
    // 只匹配特定路径，避免影响API和静态资源
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}