# Seth 项目文档

## 项目概述
Seth 是一个基于 Next.js 的 AI 对话应用，使用 Dify 作为后端 AI 服务，Supabase 作为数据库。

## 技术栈
- **前端**: Next.js 14, React, TypeScript, TailwindCSS, Framer Motion
- **后端**: Next.js API Routes
- **数据库**: Supabase (PostgreSQL)
- **AI 服务**: Dify
- **支付**: ZPay (支付宝)
- **部署**: Vercel

## 重要表结构

### user_credits 表
存储用户积分和会员信息：
- `user_id`: 用户ID
- `total_credits`: 总积分
- `used_credits`: 已使用积分
- `current_membership`: 当前会员等级（普通会员/标准会员/高级会员）
- `membership_expires_at`: 会员到期时间（普通会员为 null 表示永久）

**注意**: `remaining_credits` 是计算字段 = `total_credits - used_credits`

## 已知问题和修复记录

### 2025-12-05: 修复会员到期积分负数问题

#### 问题描述
付费用户会员到期后，积分显示为负数（如 -62）。

#### 问题根源
1. 会员过期检查在积分检查之后执行，导致过期用户继续使用
2. 积分扣减时没有检查是否会变成负数
3. 会员到期后 `used_credits` 没有正确清零

#### 修复方案

**1. 修改 `app/api/chat-stream/route.ts`**
- 优先检查会员是否过期（在积分检查之前）
- 过期时立即重置积分为15条免费积分
- 添加安全检查防止积分变成负数
- 返回带有会员到期信息的响应

**2. 修改 `app/api/credits/route.ts`**
- 添加自动修复负积分功能
- 返回会员到期提醒信息（`membershipExpiredNotice`）
- 确保不返回负数积分

**3. 新增 `app/api/payment/fix-negative-credits/route.ts`**
- GET: 查询负积分用户和过期未重置的付费会员
- POST: 修复负积分用户（重置为15条免费积分）

**4. 修改 `components/ChatInterface.tsx`**
- 添加会员到期提醒弹窗
- 处理 API 返回的会员到期信息

#### 业务逻辑说明

**会员到期处理规则**:
1. 付费会员到期后，所有剩余积分清零
2. 系统赠送15条永久有效的免费积分
3. 会员等级降为"普通会员"
4. `membership_expires_at` 设为 null（免费积分永久有效）
5. 如果用户续费，这15条免费积分会累加到新会员的积分中

**积分扣减规则**:
1. 每次对话扣减1积分
2. 扣减前检查剩余积分是否足够
3. 防止并发问题：扣减前重新获取最新积分状态
4. 不允许积分变成负数

#### API 使用说明

**查询负积分用户**:
```bash
curl https://seth-blush.vercel.app/api/payment/fix-negative-credits
```

**修复所有负积分用户**:
```bash
curl -X POST https://seth-blush.vercel.app/api/payment/fix-negative-credits
```

**修复指定用户**:
```bash
curl -X POST https://seth-blush.vercel.app/api/payment/fix-negative-credits \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

### 2025-12-05: 修复消息显示挤在一起的问题

#### 问题描述
用户重新登录后，聊天历史消息显示异常，用户消息和AI消息挤在一起，没有正确分开显示。

#### 问题根源
消息保存时使用的是用户权限的 Supabase 客户端 (`supabase`)，而不是管理员客户端 (`supabaseAdmin`)。如果 RLS 策略有限制，可能导致 `message_type` 字段没有被正确保存。

#### 修复方案

**1. 修改 `app/api/chat-stream/route.ts`**
- 使用 `supabaseAdmin` 保存消息，绕过 RLS 策略
- 添加错误日志记录消息保存状态

**2. 修改 `components/ChatInterface.tsx`**
- 在加载历史消息时添加消息类型验证
- 如果 `message_type` 缺失，根据消息索引推断类型（偶数=user，奇数=assistant）
- 添加调试日志

**3. 新增 `app/api/admin/fix-message-types/route.ts`**
- GET: 检查消息类型分布和问题消息
- POST: 自动修复缺失或错误的消息类型

**4. 新增 `app/api/admin/debug-messages/route.ts`**
- 诊断消息数据的存储格式

#### API 使用说明

**检查消息类型问题**:
```bash
curl https://seth-blush.vercel.app/api/admin/fix-message-types
```

**修复所有消息类型**:
```bash
curl -X POST https://seth-blush.vercel.app/api/admin/fix-message-types \
  -H "Content-Type: application/json" \
  -d '{"fix_all": true}'
```

## 待办事项
- [ ] 考虑添加数据库级别的触发器来处理会员到期
- [ ] 添加定时任务定期检查和修复负积分用户
- [ ] 监控日志中的积分异常情况
- [ ] 检查 RLS 策略是否正确配置 chat_messages 表

## 联系方式
- 客服微信: 15692903143
