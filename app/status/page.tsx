import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function StatusPage() {
  const supabase = createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // 测试数据库连接
  let dbStatus = 'Unknown'
  let tablesExist = {
    user_credits: false,
    chat_sessions: false,
    chat_messages: false,
  }

  try {
    // 检查表是否存在
    const { data: creditsTest, error: creditsError } = await supabase
      .from('user_credits')
      .select('count')
      .limit(1)

    if (!creditsError) {
      tablesExist.user_credits = true
    }

    const { data: sessionsTest, error: sessionsError } = await supabase
      .from('chat_sessions')
      .select('count')
      .limit(1)

    if (!sessionsError) {
      tablesExist.chat_sessions = true
    }

    const { data: messagesTest, error: messagesError } = await supabase
      .from('chat_messages')
      .select('count')
      .limit(1)

    if (!messagesError) {
      tablesExist.chat_messages = true
    }

    dbStatus = 'Connected'
  } catch (error) {
    dbStatus = 'Error: ' + (error as Error).message
  }

  return (
    <div className="min-h-screen bg-seth-dark p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-seth-gold mb-8">系统状态检查</h1>

        <div className="space-y-6">
          {/* 认证状态 */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">用户认证状态</h2>
            <div className="space-y-2">
              <div>状态: {user ? '✅ 已登录' : '❌ 未登录'}</div>
              {user && <div>用户ID: {user.id}</div>}
              {user && <div>邮箱: {user.email}</div>}
              {authError && <div className="text-red-400">错误: {authError.message}</div>}
            </div>
          </div>

          {/* 数据库状态 */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">数据库状态</h2>
            <div className="space-y-2">
              <div>连接状态: {dbStatus}</div>
              <div>user_credits 表: {tablesExist.user_credits ? '✅ 存在' : '❌ 不存在'}</div>
              <div>chat_sessions 表: {tablesExist.chat_sessions ? '✅ 存在' : '❌ 不存在'}</div>
              <div>chat_messages 表: {tablesExist.chat_messages ? '✅ 存在' : '❌ 不存在'}</div>
            </div>
          </div>

          {/* 环境变量 */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">环境配置</h2>
            <div className="space-y-2">
              <div>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 已配置' : '❌ 未配置'}</div>
              <div>Supabase Anon Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ 已配置' : '❌ 未配置'}</div>
              <div>Dify API URL: {process.env.DIFY_API_URL ? '✅ 已配置' : '❌ 未配置'}</div>
              <div>Dify API Key: {process.env.DIFY_API_KEY ? '✅ 已配置' : '❌ 未配置'}</div>
            </div>
          </div>

          {/* 操作建议 */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">下一步操作</h2>
            <div className="space-y-2 text-gray-300">
              <div>1. 如果数据库表不存在，请在 Supabase 控制台执行 supabase_schema.sql</div>
              <div>2. 确保在 Supabase 的 Authentication 设置中启用了邮箱登录</div>
              <div>3. 检查所有环境变量是否正确配置</div>
              <div>4. 测试聊天功能请访问 <a href="/chat-simple" className="text-seth-gold hover:underline">/chat-simple</a></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}