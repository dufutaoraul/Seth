-- 修复 membership_expires_at 字段的默认值和现有数据
-- 日期：2025-10-01
-- 目的：免费用户（普通会员）的积分应该永久有效，不应该有过期时间

-- 1. 修改表默认值：将 membership_expires_at 的默认值从 NOW() + 1个月 改为 NULL
ALTER TABLE user_credits
ALTER COLUMN membership_expires_at SET DEFAULT NULL;

-- 2. 更新所有普通会员的 membership_expires_at 为 NULL（免费积分永久有效）
UPDATE user_credits
SET membership_expires_at = NULL
WHERE current_membership = '普通会员';

-- 3. 验证修改结果
SELECT
  email,
  total_credits,
  used_credits,
  remaining_credits,
  current_membership,
  membership_expires_at,
  created_at
FROM user_credits uc
JOIN auth.users u ON uc.user_id = u.id
ORDER BY uc.created_at DESC
LIMIT 10;

-- 预期结果：
-- 普通会员的 membership_expires_at 应该是 NULL
-- 标准会员和高级会员的 membership_expires_at 应该有具体日期
