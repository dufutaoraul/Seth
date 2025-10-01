-- ===================================
-- 手动修复用户 3034676268@qq.com 的订单和积分
-- ===================================
-- 问题：用户支付成功，但订单状态是pending，积分未增加
-- 原因：ZPay回调失败（可能是域名问题）
-- 解决：手动标记订单为paid，并增加用户积分
-- ===================================

-- 第一步：查看当前状态
SELECT
    '=== 修复前的状态 ===' as step;

SELECT
    uc.user_id,
    au.email,
    uc.total_credits,
    uc.used_credits,
    uc.remaining_credits,
    uc.current_membership,
    uc.membership_expires_at
FROM user_credits uc
LEFT JOIN auth.users au ON uc.user_id = au.id
WHERE au.email = '3034676268@qq.com';

-- 第二步：更新第1个订单状态（选择最早的那个）
-- 注意：只处理第1个订单，第2个订单可以删除或保留为pending
UPDATE payment_orders
SET
    payment_status = 'paid',
    zpay_trade_no = 'MANUAL_FIX_' || to_char(now(), 'YYYYMMDDHH24MISS'),
    paid_at = '2025-10-01 15:20:00+00',  -- 设置为订单创建时间
    zpay_response = '{"manual_fix": true, "reason": "ZPay回调失败，手动修复", "fixed_at": "' || now()::text || '"}'
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = '3034676268@qq.com'
)
AND payment_status = 'pending'
AND created_at = (
    -- 选择最早的pending订单
    SELECT MIN(created_at)
    FROM payment_orders
    WHERE user_id IN (SELECT id FROM auth.users WHERE email = '3034676268@qq.com')
    AND payment_status = 'pending'
);

-- 第三步：更新用户积分和会员等级
-- 高级会员套餐：6次对话 + 30天会员期
UPDATE user_credits
SET
    total_credits = total_credits + 6,  -- 增加6次对话
    current_membership = '高级会员',
    membership_expires_at = now() + interval '30 days',  -- 30天后过期
    updated_at = now()
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = '3034676268@qq.com'
);

-- 第四步：删除第2个重复订单（可选）
-- 如果你想保留，可以注释掉这段
DELETE FROM payment_orders
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = '3034676268@qq.com'
)
AND payment_status = 'pending'
AND created_at > (
    -- 删除比最早订单晚创建的pending订单
    SELECT MIN(created_at)
    FROM payment_orders
    WHERE user_id IN (SELECT id FROM auth.users WHERE email = '3034676268@qq.com')
    AND payment_status = 'pending'
);

-- 第五步：查看修复后的状态
SELECT
    '=== 修复后的状态 ===' as step;

SELECT
    uc.user_id,
    au.email,
    uc.total_credits,
    uc.used_credits,
    uc.remaining_credits,
    uc.current_membership,
    uc.membership_expires_at
FROM user_credits uc
LEFT JOIN auth.users au ON uc.user_id = au.id
WHERE au.email = '3034676268@qq.com';

-- 查看订单状态
SELECT
    po.order_no,
    po.payment_status,
    po.zpay_trade_no,
    po.paid_at,
    po.amount_yuan,
    po.credits_to_add,
    po.membership_type
FROM payment_orders po
WHERE po.user_id IN (
    SELECT id FROM auth.users WHERE email = '3034676268@qq.com'
)
ORDER BY po.created_at DESC;

-- ===================================
-- 预期结果：
-- - total_credits: 15 + 6 = 21
-- - remaining_credits: 15 + 6 = 21 (假设没用过)
-- - current_membership: 高级会员
-- - membership_expires_at: 2025-10-31左右
-- - membership_active: true
-- - 1个订单状态为paid
-- - 第2个重复订单已删除
-- ===================================
