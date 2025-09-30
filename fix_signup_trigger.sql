-- 修复注册触发器，使用"普通会员"代替"免费用户"
-- 在Supabase SQL Editor中执行此脚本

-- 1. 删除旧触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. 重新创建处理新用户的函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 为新注册用户创建积分记录
  INSERT INTO public.user_credits (user_id, total_credits, used_credits, current_membership)
  VALUES (NEW.id, 15, 0, '普通会员');

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- 记录错误但不阻止用户注册
    RAISE WARNING 'Error creating user credits for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 重新创建触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. 验证触发器是否创建成功
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';