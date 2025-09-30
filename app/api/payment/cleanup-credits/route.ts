import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: '需要提供邮箱参数' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // 根据邮箱查找用户
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers()

    if (userError) {
      return NextResponse.json({ error: '查询用户失败' }, { status: 500 })
    }

    const user = users.find(u => u.email === email)

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 查找所有该用户的积分记录
    const { data: allCredits, error: findError } = await supabaseAdmin
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (findError) {
      return NextResponse.json({ error: '查询积分记录失败' }, { status: 500 })
    }

    console.log(`找到 ${allCredits?.length || 0} 条积分记录`)

    if (!allCredits || allCredits.length === 0) {
      return NextResponse.json({ error: '没有找到积分记录' }, { status: 404 })
    }

    // 如果只有一条记录，直接返回
    if (allCredits.length === 1) {
      return NextResponse.json({
        message: '只有一条记录，无需清理',
        credits: allCredits[0]
      })
    }

    // 保留最新的一条（total_credits最大的）
    const sortedCredits = [...allCredits].sort((a, b) => b.total_credits - a.total_credits)
    const keepRecord = sortedCredits[0]
    const deleteRecords = sortedCredits.slice(1)

    console.log('保留记录:', keepRecord.id, 'total_credits:', keepRecord.total_credits)
    console.log('删除记录:', deleteRecords.map(r => ({ id: r.id, total: r.total_credits })))

    // 删除旧记录
    const deleteIds = deleteRecords.map(r => r.id)
    const { error: deleteError } = await supabaseAdmin
      .from('user_credits')
      .delete()
      .in('id', deleteIds)

    if (deleteError) {
      return NextResponse.json({ error: '删除旧记录失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `清理完成，保留1条记录，删除${deleteRecords.length}条旧记录`,
      kept: keepRecord,
      deleted_count: deleteRecords.length
    })
  } catch (error) {
    console.error('清理积分记录错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}