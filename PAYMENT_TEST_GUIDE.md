# 支付功能测试指南

## 前提条件

在开始测试之前，请确保已完成以下配置：

### 1. Vercel 环境变量检查

访问 `https://你的域名/debug-payment` 查看环境变量配置状态。

**必须设置的环境变量：**
- ✅ `NEXT_PUBLIC_SITE_URL` = `https://seth-blush.vercel.app` (你的实际域名)
- ✅ `ZPAY_PID` = 你的ZPay商户ID
- ✅ `ZPAY_KEY` = 你的ZPay密钥
- ✅ `ZPAY_GATEWAY` = ZPay支付网关地址
- ✅ `NEXT_PUBLIC_SUPABASE_URL` = Supabase项目URL
- ✅ `SUPABASE_SERVICE_ROLE_KEY` = Supabase服务密钥

### 2. 确认配置正确

诊断页面应该显示：
```
notify_url: https://seth-blush.vercel.app/api/payment/notify
```

如果显示的是其他域名（如 `seth-git-master-xxx`），请立即更新环境变量。

---

## 测试流程

### 步骤 1: 登录系统

1. 访问 `https://seth-blush.vercel.app`
2. 使用账号登录
3. 确认右上角显示当前积分数量

### 步骤 2: 进入会员中心

**方法A：** 点击左侧边栏的"会员中心"按钮
**方法B：** 点击右上角的积分数字
**方法C：** 点击右上角的"购物车"图标
**方法D：** 直接访问 `https://seth-blush.vercel.app/membership`

### 步骤 3: 选择会员套餐

会员中心显示三个套餐（测试价格）：

| 套餐 | 积分 | 价格 | 有效期 |
|------|------|------|--------|
| 免费用户 | 15 | ¥0 | 永久 |
| 标准会员 | 150 | ¥1 | 30天 |
| 高级会员 | 500 | ¥2 | 30天 |

选择"标准会员"或"高级会员"，点击"购买"按钮。

### 步骤 4: 完成支付

1. 系统会创建订单并跳转到ZPay支付页面
2. 使用支付宝扫码支付（测试金额 ¥1 或 ¥2）
3. 支付成功后，ZPay会：
   - 显示支付成功页面
   - 自动跳转回 `https://seth-blush.vercel.app/payment/success`

### 步骤 5: 验证支付结果

支付成功后会发生以下事情：

#### 自动处理（ZPay回调）
1. ZPay 向 `https://seth-blush.vercel.app/api/payment/notify` 发送支付通知
2. 系统自动更新订单状态为"已支付"
3. 系统自动增加用户积分
4. 系统自动更新会员等级和到期时间

#### 用户可见结果
1. 支付成功页面显示：
   - ✅ "支付成功！"
   - 会员等级（标准会员/高级会员）
   - 获得的积分数量
   - "开始与赛斯对话"按钮

2. 点击"开始与赛斯对话"，应该：
   - 跳转到聊天界面 `/chat-test`
   - 右上角显示更新后的积分数量
   - 会员中心显示当前会员等级和到期时间

### 步骤 6: 测试积分扣除

1. 在聊天界面发送消息
2. 每发送一条消息，积分减 1
3. 右上角积分数字应立即更新
4. 当积分为 0 时：
   - 无法发送消息
   - 显示"积分不足"提示条
   - 提供"购买会员"按钮

---

## 调试工具

### 1. 支付系统诊断

访问：`https://seth-blush.vercel.app/debug-payment`

功能：
- 查看所有环境变量配置状态
- 显示 notify_url 等关键 URL
- 提供修复建议
- 测试 webhook 连接

### 2. 测试 Webhook 端点

访问：`https://seth-blush.vercel.app/api/payment/test-webhook`

使用 POST 请求测试：
```bash
curl -X POST https://seth-blush.vercel.app/api/payment/test-webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "test=true&timestamp=123456"
```

应返回：
```json
{
  "status": "success",
  "message": "测试端点正常工作",
  "received": true
}
```

### 3. 查看日志

在 Vercel 控制台查看实时日志：
1. 进入项目
2. 点击 "Deployments"
3. 选择最新部署
4. 点击 "Functions"
5. 查看 `/api/payment/notify` 的日志

---

## 常见问题

### Q1: 支付成功但积分没有增加？

**可能原因：**
- `NEXT_PUBLIC_SITE_URL` 配置错误，ZPay 无法回调
- notify_url 指向错误的域名

**解决方案：**
1. 访问 `/debug-payment` 检查配置
2. 更新 `NEXT_PUBLIC_SITE_URL` 为正确域名
3. 在 Vercel 重新部署
4. 使用新订单重新测试

### Q2: 点击"会员中心"跳转到首页？

**原因：** 用户登录状态失效

**解决方案：**
1. 清除浏览器缓存
2. 重新登录
3. 再次访问会员中心

### Q3: 支付成功页面点击按钮没反应？

**原因：** 路由配置问题

**解决方案：** 已修复，确保使用最新部署版本

### Q4: 如何手动修复未处理的订单？

**仅用于紧急情况！** 正常情况下应该自动处理。

1. 找到订单号（order_no）
2. 访问 Supabase 数据库
3. 手动更新 `payment_orders` 表的订单状态
4. 手动更新 `user_credits` 表的积分和会员信息

**但这不是长期解决方案！** 如果自动回调不工作，必须修复环境变量配置。

---

## 测试清单

完整测试前，请逐项检查：

- [ ] ✅ 环境变量已正确配置
- [ ] ✅ notify_url 指向正确域名
- [ ] ✅ Webhook 测试端点正常工作
- [ ] ✅ 可以正常登录系统
- [ ] ✅ 会员中心可以正常访问
- [ ] ✅ 可以创建支付订单
- [ ] ✅ 可以完成支付流程
- [ ] ✅ 支付后积分自动增加
- [ ] ✅ 会员等级自动更新
- [ ] ✅ 可以正常发送消息
- [ ] ✅ 积分正确扣除
- [ ] ✅ 积分为0时正确提示

---

## 生产环境配置

测试完成后，调整为正式价格：

在 `lib/zpay.ts` 修改：
```typescript
export const MEMBERSHIP_PLANS = {
  '免费用户': { credits: 15, price: 0 },
  '标准会员': { credits: 150, price: 30 },    // ¥30
  '高级会员': { credits: 500, price: 100 },   // ¥100
} as const
```

提交并部署更新。

---

## 技术细节

### 支付流程

```
用户 -> 选择套餐 -> 创建订单 -> 跳转ZPay -> 扫码支付
         ↓
    支付成功
         ↓
ZPay -> notify_url (异步回调) -> 更新订单 -> 增加积分
         ↓
    return_url (页面跳转) -> 支付成功页面
         ↓
    开始对话
```

### 关键API端点

- **创建订单:** `POST /api/payment/create`
- **支付回调:** `POST /api/payment/notify` (ZPay调用)
- **测试端点:** `POST /api/payment/test-webhook`
- **诊断信息:** `GET /api/payment/debug`
- **用户积分:** `GET /api/credits`

### 数据库表

- **payment_orders:** 存储支付订单
- **user_credits:** 存储用户积分和会员信息

---

**最后更新:** 2025-09-30
**版本:** 1.0