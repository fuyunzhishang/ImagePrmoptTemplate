# Pixmind AI Agent SaaS Template

**[中文文档](./README.zh-CN.md)** | **English**

> **[Visit Pixmind Official Site](https://www.pixmind.io/)** - The complete AI platform for image generation, video creation, and more.

A production-ready Next.js 15 SaaS template for building AI-powered image generation applications. Ship your AI startup in hours, not weeks.

![preview](preview.png)

## Open Source vs Commercial

This is the **open-source version** of the Pixmind AI Agent template, perfect for developers who want to build their own AI SaaS application.

**Looking for more?**
- **Commercial Version** - Includes advanced features, priority support, and white-label options. [Contact us](https://www.pixmind.io/) for details.
- **Agency / Reseller Program** - Want to distribute AI SaaS solutions without technical overhead? Join our program and start selling. [Learn more](https://www.pixmind.io/).

## 🚀 Features

### Core Features
- ✅ **AI Image Generation** - Multiple AI providers (Evolink, Google Gemini, etc.)
- ✅ **Text-to-Image & Image-to-Image** - Full support for both generation modes
- ✅ **Prompt Enhancement** - AI-powered prompt optimization
- ✅ **Cloud Storage** - Automatic R2 storage for all AI-generated content
- ✅ **Multi-language Support** - Built-in i18n with English and Chinese
- ✅ **Authentication** - NextAuth with Google OAuth integration
- ✅ **Responsive Design** - Mobile-first, works on all devices
- ✅ **Modern UI** - Beautiful components with Shadcn UI and Tailwind CSS

### Technical Stack
- **Framework**: Next.js 15 (App Router) + React 19
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4 + Shadcn UI
- **Authentication**: NextAuth.js
- **Database**: Supabase (PostgreSQL)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Internationalization**: next-intl
- **AI Integration**: Vercel AI SDK
- **Deployment**: Vercel, Cloudflare Pages, or Docker

## 📦 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/ai-image-saas.git
cd ai-image-saas
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
```env
# Required: NextAuth
AUTH_SECRET="your-secret-here"
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# Required: Supabase
SUPABASE_URL="your-supabase-url"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Required: Cloudflare R2 Storage (for AI-generated images/videos)
STORAGE_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"
STORAGE_REGION="auto"
STORAGE_ACCESS_KEY="your-r2-access-key-id"
STORAGE_SECRET_KEY="your-r2-secret-access-key"
STORAGE_BUCKET="your-bucket-name"
STORAGE_DOMAIN=""  # Optional: custom domain

# Optional: AI Providers
EVOLINK_API_KEY="your-evolink-api-key"
EVOLINK_API_URL="https://api.evolink.ai"
```

> 📖 **New to R2?** See our [R2 Quick Start Guide](./docs/R2_QUICKSTART.md) for detailed setup instructions.

4. **Run the development server**
```bash
pnpm dev
```

Open [http://localhost:3006](http://localhost:3006) to see your app.

## 🎨 Customization

### 1. Branding & Theme

**Update theme colors** in `app/theme.css`:
- Use [Shadcn UI Theme Generator](https://zippystarter.com/tools/shadcn-ui-theme-generator)
- Copy generated CSS to `app/theme.css`

**Update project name**:
- Change `NEXT_PUBLIC_PROJECT_NAME` in `.env.local`
- Update metadata in `i18n/messages/en.json` and `i18n/messages/zh.json`

### 2. Landing Page Content

Edit landing page translations in:
- `i18n/pages/landing/en.json` - English content
- `i18n/pages/landing/zh.json` - Chinese content

### 3. Configure AI Providers

Add your AI provider credentials in `.env.local`:

```env
# Evolink (nano-banana model)
EVOLINK_API_KEY="sk-your-key"
EVOLINK_API_URL="https://api.evolink.ai"

# Add more providers as needed
```

### 4. Authentication Setup

**Google OAuth**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URIs:
   - Development: `http://localhost:3006/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
4. Copy Client ID and Secret to `.env.local`

## 🛠️ Development

### Available Scripts

```bash
pnpm dev          # Start development server (port 3006)
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm analyze      # Analyze bundle size
```

### Project Structure

```
├── app/
│   ├── [locale]/           # Localized routes
│   │   ├── (default)/      # Main app pages
│   │   ├── (admin)/        # Admin dashboard
│   │   └── (console)/      # User console
│   └── api/                # API routes
│       └── ai/             # AI generation endpoints
├── components/
│   ├── ui/                 # Shadcn UI components
│   ├── blocks/             # Reusable page sections
│   └── auth/               # Authentication components
├── lib/                    # Utility libraries
├── i18n/                   # Internationalization
│   ├── messages/           # Global translations
│   └── pages/              # Page-specific translations
├── types/                  # TypeScript definitions
└── public/                 # Static assets
```

## 🚢 Deployment

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Fai-image-saas)

1. Click the button above
2. Configure environment variables in Vercel dashboard
3. Deploy

### Deploy to Cloudflare Pages

1. **Configure environment variables**
```bash
cp .env.example .env.production
cp wrangler.toml.example wrangler.toml
```

2. **Edit `.env.production` with your production values**

3. **Add environment variables to `wrangler.toml` under `[vars]`**

4. **Deploy**
```bash
pnpm cf:build
pnpm cf:deploy
```

### Docker Deployment

```bash
docker build -f Dockerfile -t ai-image-saas:latest .
docker run -p 3000:3000 ai-image-saas:latest
```

## 📝 Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AUTH_SECRET` | NextAuth secret key | Generate with `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID | `xxx.apps.googleusercontent.com` |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret | `GOCSPX-xxx` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJxxx...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) | `eyJxxx...` |
| `STORAGE_ENDPOINT` | Cloudflare R2 endpoint | `https://xxx.r2.cloudflarestorage.com` |
| `STORAGE_REGION` | R2 region (use "auto") | `auto` |
| `STORAGE_ACCESS_KEY` | R2 access key ID | Your R2 access key |
| `STORAGE_SECRET_KEY` | R2 secret access key | Your R2 secret |
| `STORAGE_BUCKET` | R2 bucket name | `your-bucket-name` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EVOLINK_API_KEY` | Evolink API key for nano-banana | - |
| `EVOLINK_API_URL` | Evolink API base URL | `https://api.evolink.ai` |
| `STORAGE_DOMAIN` | Custom R2 domain (optional) | - |
| `NEXT_PUBLIC_WEB_URL` | Your website URL | `http://localhost:3006` |
| `NEXT_PUBLIC_PROJECT_NAME` | Project display name | `Pixmind AI Agent` |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | Google Analytics tracking ID | - |
| `NEXT_PUBLIC_CLARITY_ID` | Microsoft Clarity tracking ID | - |
| `STRIPE_PUBLIC_KEY` | Stripe publishable key | - |
| `STRIPE_PRIVATE_KEY` | Stripe secret key | - |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_xxx` |

## 🎯 AI Provider Integration

### Currently Supported

- **Evolink** (nano-banana-2-lite) - Text-to-image and image-to-image
- **Google Gemini** (Imagen 3) - Via Vercel AI SDK

### Adding New Providers

1. Create API route in `app/api/ai/your-provider/`
2. Add axios instance in `lib/axios-config.ts`
3. Add model configuration in the models list
4. Update filtering logic in the image generation page

See `CLAUDE.md` for detailed implementation guidance.

## 🌐 Internationalization

Add new languages:

1. Add locale code to `i18n/locale.ts`
2. Create translation files:
   - `i18n/messages/{locale}.json`
   - `i18n/pages/landing/{locale}.json`
3. Update language selector in navigation

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the terms specified in the [LICENSE](LICENSE) file.

## 🔗 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Shadcn UI](https://ui.shadcn.com/)
- [NextAuth.js](https://authjs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vercel AI SDK](https://sdk.vercel.ai/)

## 💬 Support

- Documentation: [Coming Soon]
- Issues: [GitHub Issues](https://github.com/yourusername/ai-image-saas/issues)
- Discord: [Coming Soon]

---

Built with Next.js 15 and modern web technologies. Powered by [Pixmind](https://www.pixmind.io/).
