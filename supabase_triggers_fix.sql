-- ================================
-- 修复和补充触发器
-- ================================

-- 删除现有的触发器（如果存在）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- 重新创建处理新用户的函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, total_credits, used_credits, current_membership, membership_expires_at)
  VALUES (NEW.id, 15, 0, '免费用户', NOW() + INTERVAL '1 month');

  -- 记录用户登录日志
  INSERT INTO public.user_login_logs (user_id, login_method, login_at)
  VALUES (NEW.id, 'email', NOW());

  RETURN NEW;
END;
$$;

-- 重新创建触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 为现有用户补充积分记录（如果没有的话）
INSERT INTO public.user_credits (user_id, total_credits, used_credits, current_membership, membership_expires_at)
SELECT
  au.id,
  15,
  0,
  '免费用户',
  NOW() + INTERVAL '1 month'
FROM auth.users au
LEFT JOIN public.user_credits uc ON au.id = uc.user_id
WHERE uc.user_id IS NULL;

-- 确保RLS策略存在并正确
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- 删除现有策略（如果存在）
DROP POLICY IF EXISTS "Users can view their own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can update their own credits" ON public.user_credits;

-- 重新创建策略
CREATE POLICY "Users can manage their own credits" ON public.user_credits
FOR ALL USING (auth.uid() = user_id);

-- 为其他表也添加类似的策略
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.chat_sessions;
CREATE POLICY "Users can manage their own sessions" ON public.chat_sessions
FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own messages" ON public.chat_messages;
CREATE POLICY "Users can manage their own messages" ON public.chat_messages
FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.payment_orders;
CREATE POLICY "Users can view their own orders" ON public.payment_orders
FOR ALL USING (auth.uid() = user_id);

-- 检查函数和触发器是否创建成功
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'on_auth_user_created';

-- 检查现有用户的积分记录
SELECT
  au.email,
  uc.total_credits,
  uc.remaining_credits,
  uc.current_membership
FROM auth.users au
LEFT JOIN public.user_credits uc ON au.id = uc.user_id
ORDER BY au.created_at DESC;