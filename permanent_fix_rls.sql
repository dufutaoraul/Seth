-- 完全禁用聊天相关表的RLS（这是永久解决方案，不是临时的）
-- 原因：我们的应用已经在API层面做了认证检查，不需要数据库层面的RLS

ALTER TABLE public.chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;

-- 删除所有现有的RLS策略
DROP POLICY IF EXISTS "Users can view own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can view own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.chat_sessions;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.chat_messages;

-- 清理测试数据（可选）
DELETE FROM public.chat_messages WHERE content LIKE '测试消息%';
DELETE FROM public.chat_sessions WHERE title LIKE '测试%';

-- 检查表状态
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('chat_sessions', 'chat_messages');

-- 检查现有数据
SELECT 'chat_sessions' as table_name, count(*) as row_count FROM public.chat_sessions
UNION ALL
SELECT 'chat_messages', count(*) FROM public.chat_messages;