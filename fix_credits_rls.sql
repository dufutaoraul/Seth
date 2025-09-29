-- 禁用user_credits表的RLS
ALTER TABLE public.user_credits DISABLE ROW LEVEL SECURITY;

-- 删除user_credits表的RLS策略
DROP POLICY IF EXISTS "Users can view own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can insert own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can update own credits" ON public.user_credits;

-- 检查现有用户积分数据
SELECT
  uc.user_id,
  uc.total_credits,
  uc.used_credits,
  uc.remaining_credits,
  au.email
FROM public.user_credits uc
LEFT JOIN auth.users au ON uc.user_id = au.id
ORDER BY uc.created_at DESC;