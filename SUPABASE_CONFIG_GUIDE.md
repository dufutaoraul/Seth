# Supabase 配置指南 - 密码重置功能

> 更新时间：2025-10-01
> 用途：修复密码重置链接指向localhost的问题

---

## 问题描述

用户点击密码重置邮件中的链接时，跳转到 `localhost:3000` 无法访问。

**原因：** Supabase没有配置正确的Site URL和Redirect URLs。

---

## 解决步骤

### 1️⃣ 登录Supabase Dashboard

1. 访问：https://supabase.com/dashboard
2. 选择项目：**Seth**（或你的项目名称）

---

### 2️⃣ 配置Site URL（必须）

**步骤：**
1. 左侧菜单：**Settings（齿轮图标）**
2. 子菜单：**Authentication**
3. 找到：**Site URL** 字段
4. 输入：`https://seth.org.cn`（你的正式域名）
5. 点击：**Save**

**截图位置：**
```
Settings → Authentication → Site URL
```

**作用：**
- 这是Supabase用来生成邮件链接的基础URL
- 如果不配置，默认使用localhost

---

### 3️⃣ 配置Redirect URLs（必须）

**步骤：**
1. 在同一页面，向下滚动找到：**Redirect URLs**
2. 点击：**Add URL** 添加以下URL（一个一个添加）

**需要添加的URL：**

```text
https://seth.org.cn/reset-password
https://seth.org.cn/*
https://seth-blush.vercel.app/reset-password
https://seth-blush.vercel.app/*
http://localhost:3000/reset-password
http://localhost:3000/*
```

3. 点击：**Save**

**作用：**
- 白名单允许的重定向URL
- 防止钓鱼攻击
- `*` 通配符允许所有子路径

---

### 4️⃣ 检查Email Template（可选）

**步骤：**
1. 左侧菜单：**Authentication**
2. 子菜单：**Email Templates**
3. 选择：**Reset Password**
4. 确认模板中包含：`{{ .ConfirmationURL }}`

**默认模板示例：**
```html
<h2>Reset Password</h2>

<p>Follow this link to reset the password for your user:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
```

**注意：**
- 不要修改 `{{ .ConfirmationURL }}`，这是Supabase自动生成的链接
- 这个链接会使用你配置的Site URL

---

### 5️⃣ 配置Vercel环境变量（推荐）

**步骤：**
1. 访问：https://vercel.com/your-project/settings/environment-variables
2. 添加环境变量：

```bash
NEXT_PUBLIC_SITE_URL=https://seth.org.cn
```

3. 应用到：**Production** 和 **Preview** 环境
4. 重新部署项目（Vercel会自动检测到环境变量变化）

**作用：**
- 代码中使用这个环境变量生成重置链接
- 确保链接始终指向生产域名

---

## 测试步骤

### 1. 测试密码重置流程

1. 访问：https://seth-blush.vercel.app
2. 点击：**忘记密码**
3. 输入邮箱：你的测试邮箱
4. 点击：**发送重置邮件**
5. 检查邮箱，打开重置邮件
6. 点击邮件中的链接
7. **预期结果：** 跳转到 `https://seth-blush.vercel.app/reset-password`
8. **不应该：** 跳转到 `localhost:3000`

### 2. 验证配置是否生效

**方法1：检查邮件链接**
- 邮件中的链接应该以 `https://seth-blush.vercel.app` 开头

**方法2：检查浏览器URL**
- 点击链接后，浏览器地址栏应该显示生产域名，而不是localhost

---

## 常见问题

### Q1: 配置后还是跳转到localhost怎么办？

**A:** 可能的原因和解决方法：

1. **清除浏览器缓存**
   - 重新请求密码重置邮件
   - 使用新邮件中的链接

2. **检查Supabase配置是否保存**
   - 重新访问Settings → Authentication
   - 确认Site URL和Redirect URLs都已保存

3. **等待配置生效**
   - Supabase配置可能需要几分钟生效
   - 重新请求密码重置邮件测试

4. **检查Vercel环境变量**
   - 确认 `NEXT_PUBLIC_SITE_URL` 已配置
   - 重新部署项目

### Q2: 本地开发时也要配置吗？

**A:** 是的，但配置不同：

**本地开发配置：**
```bash
# .env.local
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**生产环境配置：**
```bash
# Vercel环境变量
NEXT_PUBLIC_SITE_URL=https://seth-blush.vercel.app
```

**Supabase Redirect URLs需要同时包含两个：**
- `http://localhost:3000/*`（本地开发）
- `https://seth-blush.vercel.app/*`（生产环境）

### Q3: 为什么需要添加通配符 `*`？

**A:** 通配符允许所有子路径：

- ✅ `https://seth-blush.vercel.app/*` 允许：
  - `/reset-password`
  - `/reset-password?token=xxx`
  - `/chat`
  - 等所有路径

- ❌ 没有通配符只允许：
  - `https://seth-blush.vercel.app` 根路径

---

## 配置检查清单

使用这个清单确保所有配置正确：

- [ ] Supabase Site URL 设置为 `https://seth-blush.vercel.app`
- [ ] Supabase Redirect URLs 包含生产域名
- [ ] Supabase Redirect URLs 包含localhost（开发用）
- [ ] Vercel环境变量 `NEXT_PUBLIC_SITE_URL` 已配置
- [ ] 项目已重新部署
- [ ] 密码重置功能测试通过

---

## 安全注意事项

1. **不要公开Site URL配置**
   - 虽然URL本身不是秘密，但配置截图可能包含其他敏感信息

2. **只添加信任的Redirect URLs**
   - 不要添加不属于你的域名
   - 避免使用过于宽泛的通配符

3. **定期检查Redirect URLs列表**
   - 删除不再使用的测试域名
   - 保持列表简洁

---

## 技术原理

### Supabase密码重置流程

1. 用户请求重置密码（输入邮箱）
2. 前端调用 `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
3. Supabase生成重置token
4. Supabase发送邮件，邮件中的链接 = `Site URL` + `/reset-password` + `#access_token=xxx`
5. 用户点击链接，跳转到配置的Site URL
6. 前端检测token，允许用户设置新密码
7. 调用 `supabase.auth.updateUser({ password })` 完成重置

### 为什么要配置redirectTo？

代码中的配置：
```typescript
const redirectUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`
  : `${window.location.origin}/reset-password`
```

- 优先使用环境变量（服务器端和客户端都正确）
- 回退到 `window.location.origin`（客户端可能不可靠）
- 配合Supabase的Site URL，确保链接始终正确

---

## 相关文档

- [Supabase Authentication Documentation](https://supabase.com/docs/guides/auth)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

---

**配置完成后，记得测试密码重置功能是否正常工作！**
