# 与赛斯对话 - AI智慧聊天系统

基于 Next.js 14、Supabase、Dify API 和 ZPay 构建的智能聊天系统。

## 功能特性

- 🤖 **AI 智能对话** - 集成 Dify 工作流，提供专业的赛斯哲学对话体验
- 💳 **积分制会员系统** - 免费用户15次/月，标准会员150次/月，高级会员500次/月
- 🔐 **邮箱认证登录** - 基于 Supabase Auth 的安全认证系统
- 💰 **在线支付** - 集成 ZPay 支付网关，支持支付宝、微信支付
- 📱 **响应式设计** - 支持桌面端和移动端，流畅的用户体验
- ✨ **星空主题 UI** - 炫酷的星空背景效果，符合赛斯哲学的神秘感

## 技术栈

- **前端**: Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion
- **后端**: Next.js API Routes, Supabase Functions
- **数据库**: Supabase (PostgreSQL)
- **认证**: Supabase Auth (邮箱登录)
- **AI服务**: Dify API
- **支付**: ZPay 支付网关
- **部署**: Vercel (推荐)

## 快速开始

### 1. 环境要求

- Node.js 18+
- npm 或 yarn

### 2. 克隆项目

\`\`\`bash
git clone <项目地址>
cd seth-chat
\`\`\`

### 3. 安装依赖

\`\`\`bash
npm install
\`\`\`

### 4. 环境配置

复制 \`.env.local\` 文件并配置以下环境变量：

\`\`\`env
# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Dify配置
DIFY_API_URL=https://pro.aifunbox.com/v1
DIFY_API_KEY=your_dify_api_key

# ZPay配置
ZPAY_PID=your_zpay_pid
ZPAY_KEY=your_zpay_key
ZPAY_GATEWAY=https://zpayz.cn

# 网站配置
NEXT_PUBLIC_SITE_URL=http://localhost:3000
\`\`\`

### 5. 数据库设置

1. 在 Supabase 控制台中执行 \`supabase_schema.sql\` 中的 SQL 脚本
2. 确保所有表和函数都创建成功
3. 配置 Row Level Security (RLS) 策略

### 6. 启动开发服务器

\`\`\`bash
npm run dev
\`\`\`

访问 [http://localhost:3000](http://localhost:3000) 查看效果。

## 数据库架构

系统包含以下主要数据表：

- \`user_membership_types\` - 会员等级配置
- \`user_credits\` - 用户积分记录
- \`chat_sessions\` - 聊天会话
- \`chat_messages\` - 聊天消息
- \`payment_orders\` - 支付订单
- \`user_login_logs\` - 登录日志
- \`credit_usage_logs\` - 积分使用记录

## 部署指南

### Vercel 部署

1. 将代码推送到 GitHub
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 部署完成

### 其他平台

项目同样支持部署到 Netlify、Railway 等平台。

## 会员系统

- **免费用户**: 15次对话/月，¥0
- **标准会员**: 150次对话/月，¥145
- **高级会员**: 500次对话/月，¥360

## 支付流程

1. 用户选择会员套餐
2. 创建支付订单
3. 跳转到 ZPay 支付页面
4. 支付完成后回调通知
5. 系统自动更新用户积分和会员状态

## API 接口

- \`POST /api/chat\` - 发送消息
- \`POST /api/payment/create\` - 创建支付订单
- \`POST /api/payment/notify\` - 支付回调通知

## 开发说明

### 项目结构

\`\`\`
├── app/                    # Next.js 13+ 应用目录
│   ├── api/               # API 路由
│   ├── chat/              # 聊天页面
│   ├── membership/        # 会员中心
│   └── payment/           # 支付相关页面
├── components/            # React 组件
├── lib/                   # 工具库
│   ├── supabase.ts       # Supabase 客户端
│   ├── dify.ts           # Dify API
│   └── zpay.ts           # ZPay 支付
└── public/               # 静态资源
\`\`\`

### 核心功能

1. **聊天系统**: 基于 Dify API 的智能对话
2. **积分系统**: 每次对话消耗1个积分
3. **会员系统**: 不同等级的月度积分配额
4. **支付系统**: ZPay 网关集成

## 注意事项

- 确保 Supabase RLS 策略正确配置
- ZPay 回调地址需要公网可访问
- Dify API 密钥需要妥善保管
- 生产环境请使用 HTTPS

## 许可证

MIT License

## 联系方式

如有问题请联系：[your-email@example.com]