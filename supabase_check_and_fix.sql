-- 检查并修复 Supabase 表结构和 RLS 策略

-- 1. 检查表是否存在，如果不存在则创建
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.user_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_credits INTEGER DEFAULT 15 NOT NULL,
  used_credits INTEGER DEFAULT 0 NOT NULL,
  remaining_credits INTEGER GENERATED ALWAYS AS (total_credits - used_credits) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  dify_conversation_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message_type TEXT CHECK (message_type IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  dify_conversation_id TEXT,
  dify_message_id TEXT,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. 启用 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 3. 删除现有策略（如果存在）
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can insert own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can update own credits" ON public.user_credits;

DROP POLICY IF EXISTS "Users can view own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.chat_sessions;

DROP POLICY IF EXISTS "Users can view own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.chat_messages;

-- 4. 创建新的 RLS 策略
-- Profiles 策略
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- User Credits 策略
CREATE POLICY "Users can view own credits" ON public.user_credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits" ON public.user_credits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credits" ON public.user_credits
  FOR UPDATE USING (auth.uid() = user_id);

-- Chat Sessions 策略
CREATE POLICY "Users can view own sessions" ON public.chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Chat Messages 策略
CREATE POLICY "Users can view own messages" ON public.chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. 创建索引优化性能
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON public.chat_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- 6. 创建触发器自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_credits_updated_at ON public.user_credits;
CREATE TRIGGER update_user_credits_updated_at
    BEFORE UPDATE ON public.user_credits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON public.chat_sessions;
CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON public.chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. 检查数据
SELECT 'profiles' as table_name, count(*) as row_count FROM public.profiles
UNION ALL
SELECT 'user_credits', count(*) FROM public.user_credits
UNION ALL
SELECT 'chat_sessions', count(*) FROM public.chat_sessions
UNION ALL
SELECT 'chat_messages', count(*) FROM public.chat_messages;

-- 8. 显示最近的聊天记录（用于调试）
SELECT
    cs.id as session_id,
    cs.title,
    cs.user_id,
    cs.created_at as session_created,
    count(cm.id) as message_count
FROM public.chat_sessions cs
LEFT JOIN public.chat_messages cm ON cs.id = cm.session_id
GROUP BY cs.id, cs.title, cs.user_id, cs.created_at
ORDER BY cs.created_at DESC
LIMIT 10;

-- 显示最近的消息记录
SELECT
    cm.id,
    cm.session_id,
    cm.user_id,
    cm.message_type,
    substring(cm.content, 1, 50) as content_preview,
    cm.created_at
FROM public.chat_messages cm
ORDER BY cm.created_at DESC
LIMIT 20;