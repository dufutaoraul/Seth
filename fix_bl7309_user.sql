-- ================================
-- 修复 bl7309@163.com 用户的积分数据
-- ================================
-- 日期：2025-11-04
-- 问题：用户充值145元后显示-31积分

-- 1. 查看该用户的当前状态
SELECT
  u.email,
  uc.user_id,
  uc.total_credits,
  uc.used_credits,
  uc.remaining_credits,
  uc.current_membership,
  uc.membership_expires_at,
  CASE
    WHEN uc.membership_expires_at IS NULL THEN '永久'
    WHEN uc.membership_expires_at < NOW() THEN '已过期'
    ELSE '有效'
  END as membership_status
FROM user_credits uc
JOIN auth.users u ON uc.user_id = u.id
WHERE u.email = 'bl7309@163.com';

-- 2. 查看该用户的支付记录
SELECT
  order_no,
  membership_type,
  amount_yuan,
  credits_to_add,
  payment_status,
  paid_at,
  created_at
FROM payment_orders po
JOIN auth.users u ON po.user_id = u.id
WHERE u.email = 'bl7309@163.com'
ORDER BY created_at DESC;

-- 3. 修复方案：
-- 情况A：如果会员已过期 → total_credits = 15 + 150 = 165, used_credits = 0
-- 情况B：如果会员有效 → total_credits = 150, used_credits = 0

-- 先检查会员是否过期，然后选择对应的修复方案

-- 方案A：会员已过期，应该有165积分（15免费+150充值）
UPDATE user_credits
SET
  total_credits = 165,  -- 15条免费积分 + 150条充值积分
  used_credits = 0,
  current_membership = '标准会员',
  membership_expires_at = NOW() + INTERVAL '30 days'  -- 从现在开始30天
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'bl7309@163.com')
  AND (membership_expires_at IS NULL OR membership_expires_at < NOW());

-- 方案B：会员有效，应该有150积分（仅充值积分）
UPDATE user_credits
SET
  total_credits = 150,
  used_credits = 0
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'bl7309@163.com')
  AND membership_expires_at IS NOT NULL
  AND membership_expires_at >= NOW();

-- 4. 验证修复结果
SELECT
  u.email,
  uc.total_credits,
  uc.used_credits,
  uc.remaining_credits,
  uc.current_membership,
  uc.membership_expires_at,
  CASE
    WHEN uc.membership_expires_at IS NULL THEN '永久'
    WHEN uc.membership_expires_at < NOW() THEN '已过期'
    ELSE '有效'
  END as membership_status
FROM user_credits uc
JOIN auth.users u ON uc.user_id = u.id
WHERE u.email = 'bl7309@163.com';
