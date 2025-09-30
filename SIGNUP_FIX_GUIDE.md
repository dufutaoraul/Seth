# 注册功能修复指南

## 问题原因
注册失败的根本原因是Supabase的邮箱验证设置。需要在Supabase后台禁用邮箱验证。

## 修复步骤

### 步骤1：禁用邮箱验证

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择您的项目
3. 左侧菜单点击 **Authentication** → **Providers**
4. 找到 **Email** provider，点击编辑
5. 关闭 **Confirm email** 选项
6. 保存设置

### 步骤2：执行SQL修复触发器

在 **SQL Editor** 中执行以下SQL：

```sql
-- 1. 删除旧触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. 创建新的用户创建函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- 为新用户创建积分记录
  INSERT INTO public.user_credits (user_id, total_credits, used_credits, current_membership)
  VALUES (NEW.id, 15, 0, '普通会员')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 3. 创建触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. 为现有用户补充积分记录
INSERT INTO public.user_credits (user_id, total_credits, used_credits, current_membership)
SELECT
  au.id,
  15,
  0,
  '普通会员'
FROM auth.users au
LEFT JOIN public.user_credits uc ON au.id = uc.user_id
WHERE uc.id IS NULL
ON CONFLICT (user_id) DO NOTHING;
```

### 步骤3：测试注册

1. 清除浏览器缓存
2. 访问 https://seth-blush.vercel.app
3. 使用新邮箱注册测试
4. 注册成功后应自动登录并获得15积分

## 如果仍然失败

检查Supabase日志：
1. 进入 **Logs** → **Postgres Logs**
2. 查看注册时的错误信息
3. 截图发给我分析