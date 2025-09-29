const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

// 加载环境变量
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('缺少Supabase环境变量')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTables() {
  console.log('检查数据库表格...')

  try {
    // 检查用户积分表
    const { data: credits, error: creditsError } = await supabase
      .from('user_credits')
      .select('*')
      .limit(1)

    if (creditsError) {
      console.log('❌ user_credits表不存在:', creditsError.message)
    } else {
      console.log('✅ user_credits表存在')
    }

    // 检查聊天会话表
    const { data: sessions, error: sessionsError } = await supabase
      .from('chat_sessions')
      .select('*')
      .limit(1)

    if (sessionsError) {
      console.log('❌ chat_sessions表不存在:', sessionsError.message)
    } else {
      console.log('✅ chat_sessions表存在')
    }

    // 检查聊天消息表
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .limit(1)

    if (messagesError) {
      console.log('❌ chat_messages表不存在:', messagesError.message)
    } else {
      console.log('✅ chat_messages表存在')
    }

    // 检查会员表
    const { data: memberships, error: membershipsError } = await supabase
      .from('memberships')
      .select('*')
      .limit(1)

    if (membershipsError) {
      console.log('❌ memberships表不存在:', membershipsError.message)
    } else {
      console.log('✅ memberships表存在')
    }

    // 检查支付记录表
    const { data: payments, error: paymentsError } = await supabase
      .from('payment_records')
      .select('*')
      .limit(1)

    if (paymentsError) {
      console.log('❌ payment_records表不存在:', paymentsError.message)
    } else {
      console.log('✅ payment_records表存在')
    }

  } catch (error) {
    console.error('检查表格时出错:', error)
  }
}

async function initializeDatabase() {
  console.log('开始初始化数据库...')

  try {
    // 检查当前用户
    const { data: { user } } = await supabase.auth.getUser()
    console.log('当前用户:', user?.email || '未登录')

    await checkTables()

  } catch (error) {
    console.error('初始化数据库时出错:', error)
  }
}

initializeDatabase()