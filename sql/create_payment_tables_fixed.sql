-- 创建支付订单表
CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_no VARCHAR(255) UNIQUE NOT NULL,
  membership_type VARCHAR(50) NOT NULL,
  amount_yuan DECIMAL(10,2) NOT NULL,
  credits_to_add INTEGER NOT NULL,
  payment_method VARCHAR(20) NOT NULL DEFAULT 'alipay',
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  zpay_trade_no VARCHAR(255),
  zpay_response TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引（使用IF NOT EXISTS）
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_order_no ON payment_orders(order_no);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at ON payment_orders(created_at);

-- 禁用RLS（为了简化，实际生产环境建议启用适当的RLS策略）
ALTER TABLE payment_orders DISABLE ROW LEVEL SECURITY;

-- 创建会员套餐记录表
CREATE TABLE IF NOT EXISTS user_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  membership_type VARCHAR(50) NOT NULL,
  credits_purchased INTEGER NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  payment_order_id UUID REFERENCES payment_orders(id),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, payment_order_id)
);

-- 创建索引（使用IF NOT EXISTS）
CREATE INDEX IF NOT EXISTS idx_user_memberships_user_id ON user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_purchased_at ON user_memberships(purchased_at);

-- 禁用RLS
ALTER TABLE user_memberships DISABLE ROW LEVEL SECURITY;

-- 修改user_credits表，添加会员等级相关字段（使用IF NOT EXISTS）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_credits' AND column_name='current_membership') THEN
        ALTER TABLE user_credits ADD COLUMN current_membership VARCHAR(50) DEFAULT '免费用户';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_credits' AND column_name='membership_expires_at') THEN
        ALTER TABLE user_credits ADD COLUMN membership_expires_at TIMESTAMPTZ;
    END IF;
END $$;

-- 创建更新时间函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 安全地创建触发器
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_payment_orders_updated_at') THEN
        CREATE TRIGGER update_payment_orders_updated_at
        BEFORE UPDATE ON payment_orders
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 添加表注释
COMMENT ON TABLE payment_orders IS '支付订单表，记录所有支付订单信息';
COMMENT ON TABLE user_memberships IS '用户会员购买记录表';