-- ================================
-- 修复负积分问题
-- ================================
-- 日期：2025-11-04
-- 问题：会员到期后重新购买会员，积分显示为负数
-- 原因：会员到期时没有自动重置积分，导致 used_credits 过大
-- 解决方案：查找所有负积分的用户并修复

-- 1. 查找所有负积分的用户
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
WHERE uc.remaining_credits < 0
ORDER BY uc.remaining_credits ASC;

-- 2. 修复所有负积分的用户
-- 策略：
-- - 如果会员已过期，重置为15条免费积分
-- - 如果会员有效，将 used_credits 重置为0，保留 total_credits

-- 2a. 修复已过期会员的负积分（重置为15条免费积分）
UPDATE user_credits
SET
  total_credits = 15,
  used_credits = 0,
  current_membership = '普通会员',
  membership_expires_at = NULL
WHERE remaining_credits < 0
  AND (membership_expires_at IS NULL OR membership_expires_at < NOW());

-- 2b. 修复有效会员的负积分（保留总积分，清零已用积分）
UPDATE user_credits
SET
  used_credits = 0
WHERE remaining_credits < 0
  AND membership_expires_at IS NOT NULL
  AND membership_expires_at >= NOW();

-- 3. 验证修复结果
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
WHERE u.email IN (
  SELECT u2.email
  FROM user_credits uc2
  JOIN auth.users u2 ON uc2.user_id = u2.id
  WHERE uc2.remaining_credits < 0
)
ORDER BY uc.remaining_credits ASC;

-- 4. 检查是否还有负积分
SELECT COUNT(*) as negative_credits_count
FROM user_credits
WHERE remaining_credits < 0;
