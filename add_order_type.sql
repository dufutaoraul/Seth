-- 为 payment_orders 表添加 order_type 字段
-- 用于区分会员套餐订单和积分包订单

-- 添加 order_type 列
ALTER TABLE payment_orders
ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'membership';

-- 为现有记录设置 order_type
UPDATE payment_orders
SET order_type = 'membership'
WHERE order_type IS NULL;

-- 添加注释
COMMENT ON COLUMN payment_orders.order_type IS '订单类型: membership=会员套餐, credit_pack=积分包';