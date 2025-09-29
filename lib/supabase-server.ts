import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 服务端客户端 - 用于页面组件
export function createServerSupabaseClient() {
  const cookieStore = cookies()

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get: (name: string) => {
          const cookie = cookieStore.get(name)
          console.log(`Getting cookie ${name}:`, cookie?.value ? 'found' : 'not found')
          return cookie?.value
        },
        set: (name: string, value: string, options: any) => {
          try {
            console.log(`Setting cookie ${name}`)
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            console.error('Failed to set cookie:', error)
          }
        },
        remove: (name: string, options: any) => {
          try {
            console.log(`Removing cookie ${name}`)
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            console.error('Failed to remove cookie:', error)
          }
        },
      },
    }
  )
}

// 中间件专用的服务端客户端
export function createMiddlewareSupabaseClient(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get: (name: string) => {
          return request.cookies.get(name)?.value
        },
        set: (name: string, value: string, options: any) => {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove: (name: string, options: any) => {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  return { supabase, response }
}