-- ===================================
-- 检查用户 3034676268@qq.com 的完整信息
-- ===================================

-- 1. 查看用户基本信息和积分
SELECT
    uc.user_id,
    au.email,
    uc.total_credits,
    uc.used_credits,
    uc.remaining_credits,
    uc.current_membership,
    uc.membership_expires_at,
    uc.membership_active,
    uc.created_at,
    uc.updated_at
FROM user_credits uc
LEFT JOIN auth.users au ON uc.user_id = au.id
WHERE au.email = '3034676268@qq.com';

-- 2. 查看该用户的所有订单（使用从查询1获取的user_id）
-- 先执行查询1获取正确的user_id，然后替换下面的UUID
SELECT
    po.id,
    po.order_no,
    po.user_id,
    po.membership_type,
    po.order_type,
    po.amount_yuan,
    po.credits_to_add,
    po.payment_method,
    po.payment_status,
    po.zpay_trade_no,
    po.created_at,
    po.paid_at,
    po.zpay_response
FROM payment_orders po
WHERE po.user_id IN (
    SELECT user_id FROM user_credits uc
    LEFT JOIN auth.users au ON uc.user_id = au.id
    WHERE au.email = '3034676268@qq.com'
)
ORDER BY po.created_at DESC;

-- 3. 查看该用户邮箱相关的所有订单（如果user_id关联失败）
-- 注意：这个查询需要先从auth.users获取email，然后关联
SELECT
    po.id,
    po.order_no,
    po.user_id,
    po.membership_type,
    po.order_type,
    po.amount_yuan,
    po.credits_to_add,
    po.payment_method,
    po.payment_status,
    po.zpay_trade_no,
    po.created_at,
    po.paid_at
FROM payment_orders po
WHERE po.user_id IN (
    SELECT id FROM auth.users WHERE email = '3034676268@qq.com'
)
ORDER BY po.created_at DESC;

-- 4. 查看所有pending状态的订单（可能有遗漏的订单）
SELECT
    po.id,
    po.order_no,
    po.user_id,
    po.membership_type,
    po.order_type,
    po.amount_yuan,
    po.credits_to_add,
    po.payment_method,
    po.payment_status,
    po.zpay_trade_no,
    po.created_at,
    po.paid_at,
    au.email
FROM payment_orders po
LEFT JOIN auth.users au ON po.user_id = au.id
WHERE po.payment_status = 'pending'
ORDER BY po.created_at DESC
LIMIT 20;

-- 5. 查看所有paid状态但未处理完成的订单（积分未加上）
-- 这里假设如果订单是paid但用户积分没变化，可能是回调失败
SELECT
    po.id,
    po.order_no,
    po.user_id,
    au.email,
    po.membership_type,
    po.order_type,
    po.amount_yuan,
    po.credits_to_add,
    po.payment_status,
    po.created_at,
    po.paid_at,
    uc.total_credits,
    uc.current_membership
FROM payment_orders po
LEFT JOIN auth.users au ON po.user_id = au.id
LEFT JOIN user_credits uc ON po.user_id = uc.user_id
WHERE po.payment_status = 'paid'
  AND po.created_at > '2025-09-29'  -- 最近的订单
ORDER BY po.created_at DESC;

-- 6. 查看该用户的认证信息（从auth.users表）
SELECT
    id,
    email,
    email_confirmed_at,
    created_at,
    updated_at,
    last_sign_in_at
FROM auth.users
WHERE email = '3034676268@qq.com';

-- ===================================
-- 预期结果分析
-- ===================================
-- 如果查询2和3没有返回任何订单，说明：
--   问题1：用户支付了但订单根本没有创建（前端或API问题）
--   问题2：订单创建时使用了错误的user_id
--   问题3：订单在另一个账户下（用户可能注册了多个账号）
--
-- 如果查询2返回订单但payment_status='pending'，说明：
--   问题：支付回调没有执行或者失败了
--   解决：需要手动调用 /api/payment/manual-fix
--
-- 如果查询2返回订单且payment_status='paid'，说明：
--   问题：回调执行了但积分更新失败
--   解决：需要手动更新user_credits表
-- ===================================
