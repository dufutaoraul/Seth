# 与赛斯对话 - 网页端付费逻辑文档

> 更新时间：2025-10-01
> 版本：v2.0（修正版）
> 作者：赛斯智慧团队

---

## 📋 核心逻辑总结

### 免费积分规则（重要修正）

**新用户注册：**
- 赠送 **15条免费积分**
- **永久有效**（不会过期，不会重置）
- 用完为止，不会每月重置

**付费会员过期时：**
- 降级为普通会员
- **再次赠送15条免费积分**（在现有积分基础上+15）
- 这15条积分同样**永久有效**

**重要说明：**
- ❌ 没有"每月重置15积分"的逻辑
- ❌ 免费用户不会定期获得积分
- ✅ 免费积分只在两种情况下赠送：新用户注册 & 付费会员过期

---

## 👥 会员等级体系

### 1. 普通会员（免费用户）
**数据库标识**：`current_membership: '普通会员'`

**权益：**
- 新注册赠送：15条永久积分
- 付费会员到期赠送：15条永久积分
- **无有效期限制**
- 用完需购买会员套餐

**数据库字段：**
```javascript
{
  current_membership: '普通会员',
  total_credits: 15,
  used_credits: 0,
  membership_expires_at: null  // 免费积分永久有效
}
```

---

### 2. 标准会员
**数据库标识**：`current_membership: '标准会员'`

**权益：**
- 测试价格：¥1 / 3积分
- 正式价格：¥145 / 150积分
- 有效期：30天
- 可叠加购买

**数据库字段：**
```javascript
{
  current_membership: '标准会员',
  total_credits: 15 + 3,  // 原有积分 + 新购买积分
  used_credits: 0,
  membership_expires_at: '2025-10-31T00:00:00Z'  // 30天后
}
```

---

### 3. 高级会员
**数据库标识**：`current_membership: '高级会员'`

**权益：**
- 测试价格：¥2 / 6积分
- 正式价格：¥360 / 500积分
- 有效期：30天
- 可叠加购买

**功能说明：**
- **注意**：高级会员的"高级思维引导"、"优先响应"等功能仅为营销描述
- 实际使用的AI服务与标准会员完全相同
- 差异仅在于积分数量和价格

---

## 🛒 订单类型

### 1. 会员套餐（membership）
**适用场景：**
- 免费用户首次购买
- 付费会员续费
- 标准会员购买标准套餐
- 高级会员购买高级套餐

**逻辑：**
```javascript
{
  order_type: 'membership',
  membership_type: '标准会员' | '高级会员',
  // 处理逻辑：
  // 1. 增加积分（累加）
  // 2. 更新会员等级
  // 3. 延长有效期30天（从当前到期日或当前时间开始计算）
}
```

**有效期计算：**
```javascript
const now = new Date()
const currentExpiry = user.membership_expires_at
  ? new Date(user.membership_expires_at)
  : now

// 如果还没过期，从到期时间延长；否则从现在开始
const startDate = currentExpiry > now ? currentExpiry : now
const newExpiry = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
```

---

### 2. 升级套餐（upgrade）
**适用场景：**
- 标准会员升级到高级会员

**逻辑：**
```javascript
{
  order_type: 'upgrade',
  // 处理逻辑：
  // 1. 增加积分（补差额）
  // 2. 更新会员等级为"高级会员"
  // 3. ⚠️ 不延长有效期（使用原有到期时间）
}
```

**说明：**
- 升级仅改变等级，不重置30天
- 积分补差：高级(6积分) - 标准(3积分) = 3积分差额

---

### 3. 积分包（credit_pack）
**适用场景：**
- 付费会员想增加积分但不延长有效期

**逻辑：**
```javascript
{
  order_type: 'credit_pack',
  // 处理逻辑：
  // 1. 仅增加积分
  // 2. 不改变会员等级
  // 3. 不改变有效期
}
```

---

## ⏰ 会员过期处理

### 检查时机
每次用户发送消息时检查（`/api/chat-simple/route.ts`）

### 过期逻辑
```javascript
// 只检查付费会员是否过期
if (user.membership_expires_at && user.current_membership !== '普通会员') {
  const expireDate = new Date(user.membership_expires_at)
  const now = new Date()

  if (expireDate <= now) {
    // 付费会员过期处理：
    await db.update({
      total_credits: user.total_credits + 15,  // 在现有积分基础上+15
      current_membership: '普通会员',
      membership_expires_at: null,  // 清除过期时间，免费积分永久有效
    })
  }
}
```

### 过期示例
**用户A购买标准会员：**
```javascript
// 购买前（免费用户）
{ total_credits: 15, used_credits: 5, current_membership: '普通会员', membership_expires_at: null }

// 购买后（标准会员）
{ total_credits: 10 + 3 = 13, used_credits: 5, current_membership: '标准会员', membership_expires_at: '2025-10-31' }

// 30天后过期（自动降级）
{ total_credits: 13 + 15 = 28, used_credits: 5, current_membership: '普通会员', membership_expires_at: null }
```

**用户B是高级会员，积分用完后过期：**
```javascript
// 过期前（积分已用完）
{ total_credits: 500, used_credits: 500, current_membership: '高级会员', membership_expires_at: '2025-10-31' }

// 过期后
{ total_credits: 500 + 15 = 515, used_credits: 500, current_membership: '普通会员', membership_expires_at: null }
// 剩余可用积分：515 - 500 = 15条
```

---

## 💳 支付流程

### 1. 创建订单（`/api/payment/create`）
```javascript
POST /api/payment/create
{
  "productType": "标准会员" | "高级会员" | "升级到高级" | "积分包150" | "积分包500",
  "paymentType": "alipay" | "wxpay"
}

Response:
{
  "orderNo": "20251001123456789",
  "paymentUrl": "https://zpay.example.com/...",
  "amount": 1.00,
  "productName": "标准会员"
}
```

### 2. 支付回调（`/api/payment/notify`）
```javascript
GET /api/payment/notify?out_trade_no=xxx&trade_no=xxx&money=1.00&sign=xxx

处理流程：
1. 验证签名
2. 查找订单
3. 检查订单状态（防止重复处理）
4. 更新订单状态为"paid"
5. 根据order_type更新用户积分和会员等级
6. 返回"success"
```

---

## 📊 数据库设计

### user_credits 表
```sql
CREATE TABLE user_credits (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  total_credits INTEGER DEFAULT 15,           -- 总积分
  used_credits INTEGER DEFAULT 0,             -- 已使用积分
  current_membership TEXT DEFAULT '普通会员',  -- 当前会员等级
  membership_expires_at TIMESTAMPTZ,          -- 会员到期时间（免费用户为null）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### payment_orders 表
```sql
CREATE TABLE payment_orders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  order_no TEXT UNIQUE,                       -- 订单号
  order_type TEXT,                            -- 'membership' | 'upgrade' | 'credit_pack'
  membership_type TEXT,                       -- '标准会员' | '高级会员' | null
  product_name TEXT,                          -- 商品名称
  amount DECIMAL(10,2),                       -- 支付金额
  credits_to_add INTEGER,                     -- 要增加的积分
  payment_status TEXT DEFAULT 'pending',      -- 'pending' | 'paid' | 'failed'
  zpay_trade_no TEXT,                         -- ZPay交易号
  zpay_response JSONB,                        -- ZPay回调原始数据
  paid_at TIMESTAMPTZ,                        -- 支付时间
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔧 技术实现要点

### 1. 防止重复扣积分
```javascript
// 使用管理员权限的Supabase客户端，绕过RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 确保积分更新的原子性
await supabaseAdmin
  .from('user_credits')
  .update({ used_credits: user.used_credits + 1 })
  .eq('user_id', user.id)
```

### 2. 会员过期自动处理
```javascript
// 每次聊天时检查，无需定时任务
// 只检查付费会员，免费用户永不过期
if (user.membership_expires_at && user.current_membership !== '普通会员') {
  // 检查并处理过期
}
```

### 3. 支付回调幂等性
```javascript
// 检查订单是否已处理
if (order.payment_status === 'paid') {
  return new Response('success')  // 直接返回成功，避免重复处理
}
```

---

## 🎯 测试价格 vs 正式价格

### 当前（测试阶段）
```javascript
export const MEMBERSHIP_PLANS = {
  '标准会员': { credits: 3, price: 1 },   // ¥1 / 3积分
  '高级会员': { credits: 6, price: 2 },   // ¥2 / 6积分
}
```

### 上线后（正式价格）
```javascript
export const MEMBERSHIP_PLANS = {
  '标准会员': { credits: 150, price: 145 },   // ¥145 / 150积分
  '高级会员': { credits: 500, price: 360 },   // ¥360 / 500积分
}
```

**上线前修改位置：** `lib/zpay.ts:104-109`

---

## ❓ 常见问题

### Q1: 免费用户的15积分会过期吗？
**A:** 不会！免费积分永久有效，用完为止。

### Q2: 付费会员过期后，原有剩余积分会清零吗？
**A:** 不会！过期时会在原有积分基础上+15，所有积分永久有效。

### Q3: 为什么高级会员没有特殊功能？
**A:** 高级会员的"高级思维引导"等功能仅为营销话术，实际AI服务与标准会员相同，差异仅在积分数量。

### Q4: 续费时有效期如何计算？
**A:** 如果还没过期，从到期时间延长30天；如果已过期，从购买时间延长30天。

### Q5: 积分包和会员套餐的区别？
**A:** 会员套餐会延长30天有效期，积分包不会延长有效期，只增加积分。

---

## 📝 更新日志

### v2.0 (2025-10-01)
- **重大修正**：删除免费用户30天重置逻辑
- 免费积分改为永久有效
- 付费会员过期时赠送15条永久积分
- 简化过期检查逻辑

### v1.0 (2025-09-30)
- 初始版本
- 实现会员套餐、升级、积分包三种订单类型
- 实现ZPay支付集成
