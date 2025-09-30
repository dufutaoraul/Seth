# 积分包系统设计方案

## 业务逻辑

### 1. 会员套餐（月度订阅）

用户购买会员套餐后：
- ✅ 立即获得对应积分
- ✅ 会员等级更新（标准会员/高级会员）
- ✅ 会员有效期设置为30天
- ✅ 可以开始消费积分对话

**规则：**
- 30天内积分用完后，不能再续费会员套餐
- 只能购买积分包补充
- 会员到期后（30天后），可以重新购买会员套餐

**测试期定价：**
- 标准会员：¥1 = 3积分，有效期30天
- 高级会员：¥2 = 6积分，有效期30天

**正式定价：**
- 标准会员：¥145 = 150积分，有效期30天
- 高级会员：¥360 = 500积分，有效期30天

---

### 2. 积分包（纯积分充值）

用户在会员期内用完积分后：
- ✅ 会员等级保持不变
- ✅ 会员到期时间不变
- ✅ 仅增加积分数量
- ⚠️ 不能延长会员期

**测试期定价：**
- 小积分包：¥1 = 3积分
- 大积分包：¥2 = 6积分

**正式定价：**
- 标准积分包：¥145 = 150积分
- 高级积分包：¥360 = 500积分

---

## 数据库表结构

### 主要表格说明

#### 1. `user_credits` 表（用户积分主表）

记录用户当前的积分状态和会员信息：

```sql
user_credits (
  id UUID PRIMARY KEY,
  user_id UUID (用户ID),
  total_credits INTEGER (总积分数，购买时累加),
  current_membership VARCHAR(50) (当前会员等级: 免费用户/标准会员/高级会员),
  membership_expires_at TIMESTAMPTZ (会员到期时间),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**字段说明：**
- `total_credits`：当前可用积分总数，购买会员或积分包时累加
- `current_membership`：当前会员等级
- `membership_expires_at`：会员到期时间
  - 免费用户：NULL
  - 付费会员：购买时间 + 30天
  - 购买积分包不修改此字段

**计算剩余积分：**
```sql
remaining_credits = total_credits - (已使用的对话次数)
```

---

#### 2. `payment_orders` 表（支付订单表）

记录所有支付订单（会员 + 积分包）：

```sql
payment_orders (
  id UUID PRIMARY KEY,
  user_id UUID (用户ID),
  order_no VARCHAR(255) UNIQUE (订单号),
  order_type VARCHAR(20) (订单类型: 'membership' 或 'credit_pack'),  -- 新增字段
  membership_type VARCHAR(50) (套餐类型: 标准会员/高级会员/小积分包/大积分包),
  amount_yuan DECIMAL(10,2) (支付金额),
  credits_to_add INTEGER (增加的积分数),
  payment_method VARCHAR(20) (支付方式: alipay/wxpay),
  payment_status VARCHAR(20) (支付状态: pending/paid/failed),
  zpay_trade_no VARCHAR(255) (ZPay交易号),
  zpay_response TEXT (ZPay回调原始数据),
  paid_at TIMESTAMPTZ (支付完成时间),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**新增字段：**
- `order_type`：区分订单类型
  - `'membership'`：会员套餐订单（更新会员等级 + 到期时间 + 积分）
  - `'credit_pack'`：积分包订单（仅增加积分）

---

#### 3. `user_memberships` 表（会员购买历史）

记录每次会员套餐购买（不包括积分包）：

```sql
user_memberships (
  id UUID PRIMARY KEY,
  user_id UUID (用户ID),
  membership_type VARCHAR(50) (会员类型: 标准会员/高级会员),
  credits_purchased INTEGER (购买时获得的积分),
  amount_paid DECIMAL(10,2) (支付金额),
  payment_order_id UUID (关联的订单ID),
  purchased_at TIMESTAMPTZ (购买时间),
  expires_at TIMESTAMPTZ (到期时间 = purchased_at + 30天),
  created_at TIMESTAMPTZ
)
```

**用途：**
- 统计用户购买历史
- 追踪会员续费情况
- 仅记录会员套餐购买，不记录积分包购买

---

## 购买流程对比

### 场景1：新用户首次购买会员

**操作：** 用户选择"标准会员"（¥1 = 3积分）

**数据变化：**

1. **payment_orders 插入新订单：**
```sql
INSERT INTO payment_orders (
  order_type: 'membership',
  membership_type: '标准会员',
  amount_yuan: 1.00,
  credits_to_add: 3,
  payment_status: 'paid'
)
```

2. **user_credits 更新：**
```sql
UPDATE user_credits SET
  total_credits = total_credits + 3,  -- 15 → 18
  current_membership = '标准会员',
  membership_expires_at = NOW() + INTERVAL '30 days'
```

3. **user_memberships 插入记录：**
```sql
INSERT INTO user_memberships (
  membership_type: '标准会员',
  credits_purchased: 3,
  amount_paid: 1.00,
  expires_at: NOW() + INTERVAL '30 days'
)
```

---

### 场景2：会员期内积分用完，购买积分包

**前提：** 用户是标准会员，积分已用完，会员还有20天到期

**操作：** 用户选择"小积分包"（¥1 = 3积分）

**数据变化：**

1. **payment_orders 插入新订单：**
```sql
INSERT INTO payment_orders (
  order_type: 'credit_pack',  -- 注意：是积分包
  membership_type: '小积分包',
  amount_yuan: 1.00,
  credits_to_add: 3,
  payment_status: 'paid'
)
```

2. **user_credits 更新：**
```sql
UPDATE user_credits SET
  total_credits = total_credits + 3,  -- 仅增加积分
  current_membership = '标准会员',  -- 不变
  membership_expires_at = '2025-11-18'  -- 不变（还是20天后）
```

3. **user_memberships 不插入记录**（因为不是会员套餐）

---

### 场景3：会员到期后重新购买会员

**前提：** 用户之前是标准会员，已过期30天

**操作：** 用户重新购买"高级会员"（¥2 = 6积分）

**数据变化：**

1. **payment_orders 插入新订单：**
```sql
INSERT INTO payment_orders (
  order_type: 'membership',
  membership_type: '高级会员',
  amount_yuan: 2.00,
  credits_to_add: 6,
  payment_status: 'paid'
)
```

2. **user_credits 更新：**
```sql
UPDATE user_credits SET
  total_credits = total_credits + 6,
  current_membership = '高级会员',  -- 升级到高级
  membership_expires_at = NOW() + INTERVAL '30 days'  -- 重新计算30天
```

3. **user_memberships 插入新记录：**
```sql
INSERT INTO user_memberships (
  membership_type: '高级会员',
  credits_purchased: 6,
  amount_paid: 2.00,
  expires_at: NOW() + INTERVAL '30 days'
)
```

---

## 需要修改的代码

### 1. 更新 `payment_orders` 表结构

在 Supabase 执行：

```sql
-- 添加订单类型字段
ALTER TABLE payment_orders
ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'membership';

-- 更新现有订单为会员类型
UPDATE payment_orders
SET order_type = 'membership'
WHERE order_type IS NULL;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_payment_orders_order_type
ON payment_orders(order_type);

COMMENT ON COLUMN payment_orders.order_type IS '订单类型: membership(会员套餐) 或 credit_pack(积分包)';
```

---

### 2. 更新 `lib/zpay.ts`

添加积分包配置：

```typescript
// 会员套餐配置（测试价格）
export const MEMBERSHIP_PLANS = {
  '免费用户': { credits: 15, price: 0, type: 'free' },
  '标准会员': { credits: 3, price: 1, type: 'membership' },
  '高级会员': { credits: 6, price: 2, type: 'membership' },
} as const

// 积分包配置（测试价格）
export const CREDIT_PACKS = {
  '小积分包': { credits: 3, price: 1, type: 'credit_pack' },
  '大积分包': { credits: 6, price: 2, type: 'credit_pack' },
} as const

export type MembershipType = keyof typeof MEMBERSHIP_PLANS
export type CreditPackType = keyof typeof CREDIT_PACKS
export type PurchaseType = MembershipType | CreditPackType
```

---

### 3. 更新支付回调逻辑 `app/api/payment/notify/route.ts`

根据 `order_type` 决定更新逻辑：

```typescript
// 查找订单
const { data: paymentOrder } = await supabaseAdmin
  .from('payment_orders')
  .select('*')
  .eq('order_no', orderNo)
  .single()

// 根据订单类型处理
if (paymentOrder.order_type === 'membership') {
  // 会员套餐：更新会员等级 + 到期时间 + 积分
  const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  await supabaseAdmin
    .from('user_credits')
    .update({
      total_credits: currentCredits.total_credits + paymentOrder.credits_to_add,
      current_membership: paymentOrder.membership_type,
      membership_expires_at: newExpiry.toISOString(),
    })
    .eq('user_id', paymentOrder.user_id)

  // 记录到 user_memberships
  await supabaseAdmin
    .from('user_memberships')
    .insert({
      user_id: paymentOrder.user_id,
      membership_type: paymentOrder.membership_type,
      credits_purchased: paymentOrder.credits_to_add,
      amount_paid: paymentOrder.amount_yuan,
      payment_order_id: paymentOrder.id,
      expires_at: newExpiry.toISOString(),
    })

} else if (paymentOrder.order_type === 'credit_pack') {
  // 积分包：仅增加积分
  await supabaseAdmin
    .from('user_credits')
    .update({
      total_credits: currentCredits.total_credits + paymentOrder.credits_to_add,
      // 不修改 current_membership
      // 不修改 membership_expires_at
    })
    .eq('user_id', paymentOrder.user_id)

  // 不记录到 user_memberships
}
```

---

### 4. 前端会员中心页面

需要增加积分包购买选项，并根据用户状态显示：

**显示逻辑：**
- 免费用户：只显示会员套餐
- 会员期内：显示会员套餐（禁用）+ 积分包（启用）
- 会员已过期：只显示会员套餐

---

## ZPay 自动扣款

关于第4个问题，ZPay 是否支持自动扣款：

**答案：** ZPay 一般不直接支持自动扣款（订阅模式）。

**原因：**
- ZPay 主要是支付网关，处理单次支付
- 自动扣款需要"快捷支付"或"代扣"功能
- 这些功能需要：
  1. 支付机构特殊资质
  2. 用户签约授权
  3. 更高级别的商户认证

**替代方案：**

1. **提前到期提醒**
   - 会员到期前7天发邮件/短信提醒
   - 提供续费链接

2. **自动降级**
   - 会员到期后自动变为免费用户
   - 保留历史记录

3. **积分不过期**
   - 购买的积分永久有效
   - 仅会员特权30天有效

**我的建议：**
暂时不实现自动扣款，因为：
- 增加了技术复杂度
- 需要更高级的支付资质
- 大多数用户更喜欢手动续费（控制感）

---

## 下一步操作

1. ✅ 已完成：移除会员套餐功能特权文字
2. ✅ 已完成：修改测试期积分数量
3. ⏳ 待完成：更新数据库表结构（添加 order_type）
4. ⏳ 待完成：创建积分包购买功能
5. ⏳ 待完成：更新支付回调逻辑

请告诉我是否继续实现积分包功能，还是先测试现有的会员购买流程？