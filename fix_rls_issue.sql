-- 临时禁用 RLS 来调试问题
ALTER TABLE public.chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;

-- 删除所有现有策略
DROP POLICY IF EXISTS "Users can view own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.chat_sessions;

DROP POLICY IF EXISTS "Users can view own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.chat_messages;

-- 重新创建更宽松的策略
CREATE POLICY "Enable all operations for authenticated users" ON public.chat_sessions
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON public.chat_messages
  FOR ALL USING (auth.role() = 'authenticated');

-- 重新启用 RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 检查现有数据
SELECT 'chat_sessions' as table_name, count(*) as row_count FROM public.chat_sessions
UNION ALL
SELECT 'chat_messages', count(*) FROM public.chat_messages;