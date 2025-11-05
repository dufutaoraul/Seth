-- ================================
-- 添加对话轮数限制相关字段
-- ================================

-- 1. 为 chat_sessions 表添加新字段
ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS is_summarized BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS summary_content TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_readonly BOOLEAN DEFAULT FALSE;

-- 2. 为字段添加注释
COMMENT ON COLUMN chat_sessions.is_summarized IS '是否已总结（达到50轮限制后自动总结）';
COMMENT ON COLUMN chat_sessions.summary_content IS 'AI生成的对话总结内容';
COMMENT ON COLUMN chat_sessions.is_readonly IS '是否为只读（已总结的对话不可继续）';

-- 3. 创建索引提高查询效率
CREATE INDEX IF NOT EXISTS idx_chat_sessions_is_summarized ON chat_sessions(is_summarized);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_is_readonly ON chat_sessions(is_readonly);

-- 4. 创建获取会话消息轮数的函数
CREATE OR REPLACE FUNCTION get_session_round_count(p_session_id UUID)
RETURNS INTEGER AS $$
DECLARE
    round_count INTEGER;
BEGIN
    -- 计算轮数：user消息数量 = 轮数（因为每轮是1个user消息 + 1个assistant回复）
    SELECT COUNT(*) INTO round_count
    FROM chat_messages
    WHERE session_id = p_session_id
      AND message_type = 'user';

    RETURN COALESCE(round_count, 0);
END;
$$ LANGUAGE plpgsql;

-- 5. 创建标记会话为已总结的函数
CREATE OR REPLACE FUNCTION mark_session_as_summarized(
    p_session_id UUID,
    p_summary_content TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE chat_sessions
    SET
        is_summarized = TRUE,
        summary_content = p_summary_content,
        is_readonly = TRUE,
        updated_at = NOW()
    WHERE id = p_session_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 6. 测试函数（可选）
-- SELECT get_session_round_count('your-session-id-here');
