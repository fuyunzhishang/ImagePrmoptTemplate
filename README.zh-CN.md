# Pixmind AI Agent SaaS 模板

**中文文档** | **[English](./README.md)**

> **[访问 Pixmind 官网](https://www.pixmind.io/)** - 完整的 AI 图像生成、视频创作等平台。

一个生产级的 Next.js 15 SaaS 模板，用于构建基于 AI 的图像生成应用。在几小时而非几周内推出你的 AI 创业项目。

![preview](preview.png)

## 开源版 vs 商业版

这是 Pixmind AI Agent 模板的**开源版本**，适合想要构建自己 AI SaaS 应用的开发者。

**想要更多功能？**
- **商业版** - 包含高级功能、优先技术支持和白标定制方案。[联系我们](https://www.pixmind.io/) 了解详情。
- **代理商/分销计划** - 想要分销 AI SaaS 解决方案而无需技术投入？加入我们的计划，立即开始销售。[了解更多](https://www.pixmind.io/)。

## 🚀 功能特性

### 核心功能
- ✅ **AI 图像生成** - 支持多家 AI 提供商（Evolink、Google Gemini 等）
- ✅ **文生图 & 图生图** - 完整支持两种生成模式
- ✅ **提示词增强** - AI 驱动的提示词优化
- ✅ **云存储** - 所有 AI 生成内容自动存储到 R2
- ✅ **多语言支持** - 内置中英文国际化
- ✅ **身份认证** - 集成 Google OAuth 的 NextAuth
- ✅ **响应式设计** - 移动优先，适配所有设备
- ✅ **现代化 UI** - 使用 Shadcn UI 和 Tailwind CSS 的精美组件

### 技术栈
- **框架**: Next.js 15 (App Router) + React 19
- **语言**: TypeScript (严格模式)
- **样式**: Tailwind CSS 4 + Shadcn UI
- **认证**: NextAuth.js
- **数据库**: Supabase (PostgreSQL)
- **存储**: Cloudflare R2 (S3 兼容)
- **国际化**: next-intl
- **AI 集成**: Vercel AI SDK
- **部署**: Vercel、Cloudflare Pages 或 Docker

## 📦 快速开始

### 前置要求
- Node.js 18+
- pnpm（推荐）或 npm

### 安装步骤

1. **克隆仓库**
```bash
git clone https://github.com/yourusername/ai-image-saas.git
cd ai-image-saas
```

2. **安装依赖**
```bash
pnpm install
```

3. **配置环境变量**
```bash
cp .env.example .env.local
```

编辑 `.env.local` 填入你的凭据：
```env
# 必需：NextAuth
AUTH_SECRET="your-secret-here"
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# 必需：Supabase
SUPABASE_URL="your-supabase-url"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# 必需：Cloudflare R2 存储（用于 AI 生成的图像/视频）
STORAGE_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"
STORAGE_REGION="auto"
STORAGE_ACCESS_KEY="your-r2-access-key-id"
STORAGE_SECRET_KEY="your-r2-secret-access-key"
STORAGE_BUCKET="your-bucket-name"
STORAGE_DOMAIN=""  # 可选：自定义域名

# 可选：AI 提供商
EVOLINK_API_KEY="your-evolink-api-key"
EVOLINK_API_URL="https://api.evolink.ai"
```

> 📖 **R2 新手？** 查看我们的 [R2 快速入门指南](./docs/R2_QUICKSTART.md) 获取详细配置说明。

4. **启动开发服务器**
```bash
pnpm dev
```

打开 [http://localhost:3006](http://localhost:3006) 查看应用。

## 🎨 自定义配置

### 1. 品牌与主题

**在 `app/theme.css` 中更新主题颜色**：
- 使用 [Shadcn UI 主题生成器](https://zippystarter.com/tools/shadcn-ui-theme-generator)
- 将生成的 CSS 复制到 `app/theme.css`

**更新项目名称**：
- 在 `.env.local` 中修改 `NEXT_PUBLIC_PROJECT_NAME`
- 更新 `i18n/messages/en.json` 和 `i18n/messages/zh.json` 中的元数据

### 2. 首页内容

编辑以下文件中的首页翻译：
- `i18n/pages/landing/en.json` - 英文内容
- `i18n/pages/landing/zh.json` - 中文内容

### 3. 配置 AI 提供商

在 `.env.local` 中添加你的 AI 提供商凭据：

```env
# Evolink (nano-banana 模型)
EVOLINK_API_KEY="sk-your-key"
EVOLINK_API_URL="https://api.evolink.ai"

# 根据需要添加更多提供商
```

### 4. 身份认证设置

**Google OAuth**：
1. 访问 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. 创建 OAuth 2.0 客户端 ID
3. 添加授权重定向 URI：
   - 开发环境：`http://localhost:3006/api/auth/callback/google`
   - 生产环境：`https://yourdomain.com/api/auth/callback/google`
4. 将客户端 ID 和密钥复制到 `.env.local`

## 🛠️ 开发

### 可用脚本

```bash
pnpm dev          # 启动开发服务器（端口 3006）
pnpm build        # 构建生产版本
pnpm start        # 启动生产服务器
pnpm lint         # 运行 ESLint
pnpm analyze      # 分析打包体积
```

### 项目结构

```
├── app/
│   ├── [locale]/           # 本地化路由
│   │   ├── (default)/      # 主应用页面
│   │   ├── (admin)/        # 管理后台
│   │   └── (console)/      # 用户控制台
│   └── api/                # API 路由
│       └── ai/             # AI 生成接口
├── components/
│   ├── ui/                 # Shadcn UI 组件
│   ├── blocks/             # 可复用页面区块
│   └── auth/               # 身份认证组件
├── lib/                    # 工具库
├── i18n/                   # 国际化
│   ├── messages/           # 全局翻译
│   └── pages/              # 页面专属翻译
├── types/                  # TypeScript 类型定义
└── public/                 # 静态资源
```

## 🚢 部署

### 部署到 Vercel（推荐）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Fai-image-saas)

1. 点击上方按钮
2. 在 Vercel 控制台配置环境变量
3. 部署

### 部署到 Cloudflare Pages

1. **配置环境变量**
```bash
cp .env.example .env.production
cp wrangler.toml.example wrangler.toml
```

2. **编辑 `.env.production` 填入生产环境配置**

3. **将环境变量添加到 `wrangler.toml` 的 `[vars]` 部分**

4. **部署**
```bash
pnpm cf:build
pnpm cf:deploy
```

### Docker 部署

```bash
docker build -f Dockerfile -t ai-image-saas:latest .
docker run -p 3000:3000 ai-image-saas:latest
```

## 📝 环境变量参考

### 必需变量

| 变量 | 说明 | 示例 |
|----------|-------------|---------|
| `AUTH_SECRET` | NextAuth 密钥 | 使用 `openssl rand -base64 32` 生成 |
| `AUTH_GOOGLE_ID` | Google OAuth 客户端 ID | `xxx.apps.googleusercontent.com` |
| `AUTH_GOOGLE_SECRET` | Google OAuth 客户端密钥 | `GOCSPX-xxx` |
| `SUPABASE_URL` | Supabase 项目 URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase 匿名密钥 | `eyJxxx...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务角色密钥（仅服务端） | `eyJxxx...` |
| `STORAGE_ENDPOINT` | Cloudflare R2 端点 | `https://xxx.r2.cloudflarestorage.com` |
| `STORAGE_REGION` | R2 区域（使用 "auto"） | `auto` |
| `STORAGE_ACCESS_KEY` | R2 访问密钥 ID | 你的 R2 访问密钥 |
| `STORAGE_SECRET_KEY` | R2 密钥 | 你的 R2 密钥 |
| `STORAGE_BUCKET` | R2 存储桶名称 | `your-bucket-name` |

### 可选变量

| 变量 | 说明 | 默认值 |
|----------|-------------|---------|
| `EVOLINK_API_KEY` | Evolink API 密钥（nano-banana） | - |
| `EVOLINK_API_URL` | Evolink API 基础 URL | `https://api.evolink.ai` |
| `STORAGE_DOMAIN` | 自定义 R2 域名（可选） | - |
| `NEXT_PUBLIC_WEB_URL` | 你的网站 URL | `http://localhost:3006` |
| `NEXT_PUBLIC_PROJECT_NAME` | 项目显示名称 | `Pixmind AI Agent` |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | Google Analytics 跟踪 ID | - |
| `NEXT_PUBLIC_CLARITY_ID` | Microsoft Clarity 跟踪 ID | - |
| `STRIPE_PUBLIC_KEY` | Stripe 可发布密钥 | - |
| `STRIPE_PRIVATE_KEY` | Stripe 密钥 | - |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook 签名密钥 | `whsec_xxx` |

## 🎯 AI 提供商集成

### 当前支持

- **Evolink** (nano-banana-2-lite) - 文生图和图生图
- **Google Gemini** (Imagen 3) - 通过 Vercel AI SDK

### 添加新提供商

1. 在 `app/api/ai/your-provider/` 创建 API 路由
2. 在 `lib/axios-config.ts` 添加 axios 实例
3. 在模型列表中添加模型配置
4. 更新图像生成页面中的过滤逻辑

详细实现指南请参考 `CLAUDE.md`。

## 🌐 国际化

添加新语言：

1. 在 `i18n/locale.ts` 添加语言代码
2. 创建翻译文件：
   - `i18n/messages/{locale}.json`
   - `i18n/pages/landing/{locale}.json`
3. 更新导航中的语言选择器

## 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

## 📄 许可证

本项目依据 [LICENSE](LICENSE) 文件中指定的条款进行许可。

## 🔗 资源

- [Next.js 文档](https://nextjs.org/docs)
- [Shadcn UI](https://ui.shadcn.com/)
- [NextAuth.js](https://authjs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vercel AI SDK](https://sdk.vercel.ai/)

## 💬 支持

- 文档：[即将推出]
- 问题反馈：[GitHub Issues](https://github.com/yourusername/ai-image-saas/issues)
- Discord：[即将推出]

---

使用 Next.js 15 和现代 Web 技术构建。由 [Pixmind](https://www.pixmind.io/) 提供支持。
