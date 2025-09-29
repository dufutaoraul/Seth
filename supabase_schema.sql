-- ================================
-- 与赛斯对话 - Supabase数据库架构
-- ================================

-- 1. 用户会员等级表
CREATE TABLE IF NOT EXISTS user_membership_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    monthly_credits INTEGER NOT NULL,
    price_yuan DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入会员等级数据
INSERT INTO user_membership_types (name, monthly_credits, price_yuan, description) VALUES
('免费用户', 15, 0.00, '每月15条免费对话'),
('标准会员', 150, 145.00, '每月150条对话，性价比高'),
('高级会员', 500, 360.00, '每月500条对话，无限畅聊');

-- 2. 用户积分记录表
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    total_credits INTEGER DEFAULT 15, -- 总积分
    used_credits INTEGER DEFAULT 0,   -- 已使用积分
    remaining_credits INTEGER GENERATED ALWAYS AS (total_credits - used_credits) STORED, -- 剩余积分
    current_membership VARCHAR(50) DEFAULT '免费用户',
    membership_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 month'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 3. 聊天会话表
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(200) DEFAULT '新对话',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 聊天消息表
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('user', 'assistant')),
    content TEXT NOT NULL,
    dify_conversation_id VARCHAR(100), -- Dify对话ID
    dify_message_id VARCHAR(100),      -- Dify消息ID
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 支付订单表
CREATE TABLE IF NOT EXISTS payment_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    order_no VARCHAR(50) UNIQUE NOT NULL, -- 订单号
    membership_type VARCHAR(50) NOT NULL,
    amount_yuan DECIMAL(10,2) NOT NULL,
    credits_to_add INTEGER NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'alipay', -- alipay, wxpay等
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled')),
    zpay_trade_no VARCHAR(100), -- ZPay交易号
    zpay_response TEXT,         -- ZPay响应数据
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 用户登录日志表
CREATE TABLE IF NOT EXISTS user_login_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    login_method VARCHAR(20) DEFAULT 'email',
    ip_address INET,
    user_agent TEXT,
    login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 积分消耗记录表
CREATE TABLE IF NOT EXISTS credit_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    credits_consumed INTEGER DEFAULT 1,
    remaining_credits_after INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- 触发器和函数
-- ================================

-- 1. 自动更新updated_at字段的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. 为需要updated_at的表创建触发器
CREATE TRIGGER update_user_credits_updated_at BEFORE UPDATE ON user_credits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_orders_updated_at BEFORE UPDATE ON payment_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. 新用户自动创建积分记录的函数
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_credits (user_id, total_credits, used_credits, current_membership)
    VALUES (NEW.id, 15, 0, '免费用户');
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. 新用户注册触发器
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 5. 消费积分的函数
CREATE OR REPLACE FUNCTION consume_user_credit(p_user_id UUID, p_session_id UUID, p_message_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_remaining INTEGER;
BEGIN
    -- 检查剩余积分
    SELECT remaining_credits INTO current_remaining
    FROM user_credits
    WHERE user_id = p_user_id;

    -- 如果积分不足
    IF current_remaining < 1 THEN
        RETURN FALSE;
    END IF;

    -- 扣除积分
    UPDATE user_credits
    SET used_credits = used_credits + 1
    WHERE user_id = p_user_id;

    -- 记录消费日志
    INSERT INTO credit_usage_logs (user_id, session_id, message_id, credits_consumed, remaining_credits_after)
    VALUES (p_user_id, p_session_id, p_message_id, 1, current_remaining - 1);

    RETURN TRUE;
END;
$$ language 'plpgsql';

-- 6. 月度重置积分的函数（需要定期执行）
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS INTEGER AS $$
DECLARE
    reset_count INTEGER := 0;
BEGIN
    -- 重置已过期会员的积分
    UPDATE user_credits
    SET
        used_credits = 0,
        total_credits = CASE
            WHEN membership_expires_at < NOW() THEN 15  -- 过期用户重置为免费用户
            ELSE total_credits  -- 未过期用户保持当前等级
        END,
        current_membership = CASE
            WHEN membership_expires_at < NOW() THEN '免费用户'
            ELSE current_membership
        END,
        membership_expires_at = CASE
            WHEN membership_expires_at < NOW() THEN NOW() + INTERVAL '1 month'
            ELSE membership_expires_at
        END
    WHERE membership_expires_at < NOW();

    GET DIAGNOSTICS reset_count = ROW_COUNT;
    RETURN reset_count;
END;
$$ language 'plpgsql';

-- ================================
-- 行级安全策略 (RLS)
-- ================================

-- 启用行级安全
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_usage_logs ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的数据
CREATE POLICY "Users can view their own credits" ON user_credits
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own sessions" ON chat_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own messages" ON chat_messages
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own orders" ON payment_orders
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own login logs" ON user_login_logs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own credit logs" ON credit_usage_logs
    FOR ALL USING (auth.uid() = user_id);

-- ================================
-- 索引优化
-- ================================

-- 为常用查询创建索引
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_order_no ON payment_orders(order_no);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(payment_status);

-- ================================
-- 视图 - 便于查询
-- ================================

-- 用户当前状态视图
CREATE OR REPLACE VIEW user_status_view AS
SELECT
    u.id as user_id,
    u.email,
    uc.total_credits,
    uc.used_credits,
    uc.remaining_credits,
    uc.current_membership,
    uc.membership_expires_at,
    CASE
        WHEN uc.membership_expires_at > NOW() THEN true
        ELSE false
    END as membership_active,
    uc.created_at as user_created_at
FROM auth.users u
LEFT JOIN user_credits uc ON u.id = uc.user_id;

-- 聊天统计视图
CREATE OR REPLACE VIEW chat_stats_view AS
SELECT
    cs.user_id,
    cs.id as session_id,
    cs.title,
    COUNT(cm.id) as message_count,
    MAX(cm.created_at) as last_message_at,
    cs.created_at as session_created_at
FROM chat_sessions cs
LEFT JOIN chat_messages cm ON cs.id = cm.session_id
GROUP BY cs.user_id, cs.id, cs.title, cs.created_at;