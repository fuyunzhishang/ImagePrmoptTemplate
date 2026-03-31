# CLAUDE.md

This file provides comprehensive guidance to AI assistants (like Claude Code) when working with code in this repository.

## Project Overview

This is a **Pixmind AI Agent SaaS Template** - a production-ready Next.js 15 application that demonstrates how to build a modern AI-powered image generation service. It serves as both a learning resource and a foundation for building commercial AI SaaS applications.

**Key Characteristics:**
- Educational template showcasing AI integration best practices
- Production-ready architecture with authentication, payments, and i18n
- Multiple AI provider integration examples (Evolink, Google Gemini)
- Modern tech stack with Next.js 15, React 19, TypeScript, and Tailwind CSS

## Development Commands

```bash
# Development
pnpm dev                    # Start dev server on port 3006
pnpm build                  # Build for production
pnpm start                  # Start production server
pnpm lint                   # Run ESLint

# Analysis & Deployment
pnpm analyze                # Analyze bundle size
pnpm cf:build               # Build for Cloudflare Pages
pnpm cf:preview             # Preview Cloudflare deployment
pnpm cf:deploy              # Deploy to Cloudflare Pages

# Docker
docker build -f Dockerfile -t ai-image-saas:latest .
docker run -p 3000:3000 ai-image-saas:latest
```

## Technology Stack

### Core Framework
- **Next.js 15** with App Router - Server/Client components, RSC
- **React 19** - Latest features and performance improvements
- **TypeScript** - Strict mode for type safety

### Styling & UI
- **Tailwind CSS 4** - Utility-first styling
- **Shadcn UI** - High-quality, customizable components
- **Responsive Design** - Mobile-first approach

### State & Data
- **React Context** - Global state management (see `contexts/`)
- **Supabase** - PostgreSQL database
- **NextAuth.js** - Authentication (Google OAuth)

### Internationalization
- **next-intl** - i18n with App Router support
- **Supported locales**: `en` (English), `zh` (Chinese Simplified)
- Route structure: `app/[locale]/(group)/page.tsx`

### AI Integration
- **Vercel AI SDK** - Unified AI provider interface
- **Custom Axios Instances** - Provider-specific HTTP clients
- **Task-based Generation** - Async/polling pattern for long-running tasks

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting (via editor)
- **Bundle Analyzer** - Webpack bundle analysis

## Project Architecture

### Directory Structure

```
app/
  [locale]/              # Locale-specific pages (en, zh)
    (default)/           # Main application pages
      page.tsx           # Landing page
      txt-to-image/      # Image generation pages
        [model]/         # Dynamic model routes
      text-to-prompt/    # Prompt enhancement
    (admin)/             # Admin dashboard (future)
    (console)/           # User console
      my-profile/        # User settings
      my-orders/         # Order history
  api/                   # API routes
    ai/                  # AI generation endpoints
      evolink/           # Evolink-specific routes
        generate/        # Create image generation task
        task/[taskId]/   # Query task status
      text-to-image/     # Generic text-to-image (if exists)
    auth/                # NextAuth routes (auto-generated)
    user/                # User management

components/
  ui/                    # Shadcn UI components (Button, Input, etc.)
  blocks/                # Reusable page sections (Hero, Features)
  auth/                  # Authentication components (SignInForm, etc.)
  dashboard/             # Dashboard-specific components
  console/               # User console components

lib/                     # Utility libraries
  auth.ts                # Client-side auth utilities (deprecated, use NextAuth)
  server-auth.ts         # Server-side auth utilities (deprecated)
  axios-config.ts        # Axios instances (evolinkAxios, etc.)
  api-client.ts          # Client-side API wrapper
  server-api-client.ts   # Server-side API wrapper
  logger.ts              # Logging utilities
  utils.ts               # General utilities (cn, etc.)

contexts/
  app.tsx                # Global app state (user data, etc.)
  auth-context.tsx       # Auth context (may be legacy)

i18n/
  messages/              # Global translations
    en.json              # English translations
    zh.json              # Chinese translations
  pages/                 # Page-specific translations
    landing/             # Landing page content
      en.json
      zh.json
  request.ts             # next-intl configuration
  locale.ts              # Locale definitions

types/                   # TypeScript type definitions
  index.ts               # Main type exports

services/                # Business logic (if exists)

public/                  # Static assets
  favicon.ico
  images/
```

### Authentication Architecture

**Current System: NextAuth.js**

This template uses NextAuth.js for authentication. Previous attempts to integrate with an external "AI Hub" backend have been removed for simplicity.

**Key Files:**
- `auth.ts` (root) - NextAuth configuration
- `app/api/auth/[...nextauth]/route.ts` - Auto-generated by NextAuth
- `app/[locale]/auth/signin/page.tsx` - Sign-in page
- `components/auth/signin-form.tsx` - Sign-in form component

**Auth Flow:**
1. User clicks "Sign in with Google"
2. NextAuth redirects to Google OAuth
3. User authorizes the app
4. Google redirects back with authorization code
5. NextAuth exchanges code for tokens
6. Session is created and stored
7. User is redirected to callback URL or homepage

**Accessing Auth in Components:**
```typescript
// Client components
'use client';
import { useSession } from 'next-auth/react';

export default function MyComponent() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <div>Loading...</div>;
  if (!session) return <div>Not signed in</div>;

  return <div>Welcome, {session.user?.email}</div>;
}

// Server components / API routes
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ user: session.user });
}
```

### API Architecture

**Pattern: Next.js API Routes as Backend**

All AI operations are handled through Next.js API routes. This provides:
- **Security**: API keys never exposed to client
- **Flexibility**: Easy to switch providers
- **Caching**: Can add caching layer
- **Rate Limiting**: Centralized control

**API Request Flow:**
1. **Client** → calls Next.js API route (`/api/ai/evolink/generate`)
2. **API Route** → validates session with NextAuth
3. **API Route** → calls external AI provider (Evolink, etc.)
4. **External Provider** → processes request and returns result
5. **API Route** → transforms response and returns to client

**Example API Route Pattern:**
```typescript
// app/api/ai/evolink/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { evolinkAxios } from '@/lib/axios-config';

export async function POST(request: NextRequest) {
  // 1. Validate authentication
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse request body
  const { prompt, size, quality } = await request.json();

  // 3. Call external AI provider
  const response = await evolinkAxios.post('/v1/images/generations', {
    model: 'nano-banana-2-lite',
    prompt,
    size,
    quality
  });

  // 4. Return transformed response
  return NextResponse.json({
    code: 1000,
    message: 'success',
    data: response.data
  });
}
```

### AI Features

**Supported Operations:**

1. **Text-to-Image** - Generate images from text descriptions
   - Provider: Evolink (nano-banana-2-lite)
   - Pattern: Create task → Poll status → Get result
   - Routes: `/api/ai/evolink/generate`, `/api/ai/evolink/task/[taskId]`

2. **Image-to-Image** - Transform existing images
   - Provider: Evolink (nano-banana-2-lite)
   - Pattern: Upload to R2 → Generate with reference URL
   - Routes: Same as text-to-image

3. **Prompt Enhancement** - Optimize text prompts for better results
   - Location: `app/[locale]/(default)/text-to-prompt/page.tsx`
   - Uses AI to expand and improve user prompts

**Task-based Generation Pattern (Evolink):**

Many AI providers use async task patterns for long-running operations:

```typescript
// 1. Create task
const createResponse = await fetch('/api/ai/evolink/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt, size, quality })
});
const { data: { id: taskId } } = await createResponse.json();

// 2. Poll task status
const maxAttempts = 120; // 4 minutes timeout
const pollInterval = 2000; // 2 seconds

for (let attempt = 0; attempt < maxAttempts; attempt++) {
  await new Promise(resolve => setTimeout(resolve, pollInterval));

  const statusResponse = await fetch(`/api/ai/evolink/task/${taskId}`);
  const { data: taskData } = await statusResponse.json();

  if (taskData.status === 'completed') {
    return taskData.results[0]; // Image URL
  }

  if (taskData.status === 'failed') {
    throw new Error('Generation failed');
  }

  // Update progress UI
  console.log(`Progress: ${taskData.progress}%`);
}

throw new Error('Task timeout');
```

**Model Configuration:**

Models are hardcoded in `app/[locale]/(default)/txt-to-image/[model]/page.tsx`:

```typescript
const mockModels: ImageModel[] = [
  {
    id: 'nano-banana-2-lite',
    name: 'Nano Banana Pro',
    model: 'nano-banana-2-lite',
    description: 'Cost-effective image generation model from Evolink',
    provider: 'evolink',
    supportsTextToImage: true,
    supportsImageToImage: true
  },
  // ... more models
];
```

**Route-based Model Filtering:**

The `[model]` dynamic route filters which models are shown:
- `/txt-to-image/nano-banana` → Shows only Evolink models
- `/txt-to-image/google-imagen` → Shows only Google Imagen models
- `/txt-to-image/all` → Shows all models

### Internationalization (i18n)

**Setup:**
- Library: `next-intl`
- Locales: `en`, `zh`
- Detection: From URL path (`/en/page`, `/zh/page`)
- Fallback: English (`en`)

**Translation Files:**
```
i18n/
  messages/
    en.json          # Global English translations
    zh.json          # Global Chinese translations
  pages/
    landing/
      en.json        # Landing page English content
      zh.json        # Landing page Chinese content
    # Add more page-specific translations here
```

**Usage in Components:**
```typescript
import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations('namespace');

  return <h1>{t('title')}</h1>;
}
```

**Adding New Translations:**
1. Add key to `i18n/messages/en.json`
2. Add same key to `i18n/messages/zh.json`
3. Use in component with `t('key')`

**Locale Normalization:**
- URL accepts: `zh-CN`, `zh-Hans`, `zh`
- All normalize to: `zh`
- See: `i18n/request.ts` for logic

### Object Storage (Cloudflare R2)

All AI-generated images and videos are automatically stored in Cloudflare R2 for persistence and delivery.

**Why R2?**
- **Zero egress fees**: Unlike S3, R2 doesn't charge for data transfer out
- **S3 compatible**: Works seamlessly with AWS SDK
- **Global CDN**: Automatic distribution via Cloudflare network
- **Cost-effective**: ~90% cheaper than AWS S3

**Storage Flow:**
1. AI provider generates image/video and returns temporary URL
2. Backend downloads the result from temporary URL
3. Backend uploads to R2 with organized path structure
4. Backend returns R2 public URL to client
5. Original temporary URL is kept as backup

**Path Structure:**
```
ai-generated/
  images/
    YYYY/MM/DD/
      timestamp-random.png
  videos/
    YYYY/MM/DD/
      timestamp-random.mp4
```

**Configuration (`.env.local`):**
```env
# R2 Endpoint (format: https://{account_id}.r2.cloudflarestorage.com)
STORAGE_ENDPOINT = "https://abc123.r2.cloudflarestorage.com"
STORAGE_REGION = "auto"
STORAGE_ACCESS_KEY = "your-r2-access-key-id"
STORAGE_SECRET_KEY = "your-r2-secret-access-key"
STORAGE_BUCKET = "your-bucket-name"
STORAGE_DOMAIN = "https://r2.yourdomain.com"  # Custom domain (optional)
```

**Using the Storage Service:**
```typescript
import { newStorage } from '@/lib/storage';

const storage = newStorage();

// Upload a buffer
await storage.uploadFile({
  body: buffer,
  key: 'ai-generated/images/2024/01/15/image.png',
  contentType: 'image/png',
  disposition: 'inline'
});

// Download from URL and upload to R2
await storage.downloadAndUpload({
  url: 'https://example.com/temp-image.png',
  key: 'ai-generated/images/2024/01/15/image.png',
  contentType: 'image/png'
});
```

**Automatic Upload Implementation:**

The task polling API (`app/api/ai/evolink/task/[taskId]/route.ts`) automatically handles R2 upload when generation completes:

```typescript
// When task status is 'completed'
if (taskData.status === 'completed' && taskData.results) {
  const storage = newStorage();

  const uploadedResults = await Promise.all(
    taskData.results.map(async (url) => {
      const r2Result = await storage.downloadAndUpload({
        url,
        key: generateStorageKey('images'),
        contentType: 'image/png'
      });
      return r2Result.url; // R2 URL
    })
  );

  return {
    results: uploadedResults,      // R2 URLs
    original_results: taskData.results  // Original URLs (backup)
  };
}
```

**Testing R2 Configuration:**

Use the test endpoint to verify your setup:
```bash
# Must be authenticated
GET /api/storage/test
```

Returns:
- Configuration status
- Test file upload result
- Helpful error messages if misconfigured

**Setup Guide:**

See detailed configuration instructions in `/docs/R2_SETUP.md`:
- Creating R2 bucket
- Generating API tokens
- Setting up custom domains
- Cost estimation
- Troubleshooting

## Code Conventions

### Component Structure

**Functional Components in CamelCase:**
```typescript
export default function MyComponent() {
  return <div>Hello</div>;
}
```

**Client vs Server Components:**
```typescript
// Client component (default if using hooks/interactivity)
'use client';

import { useState } from 'react';

export default function ClientComponent() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

// Server component (default in App Router)
import { auth } from '@/auth';

export default async function ServerComponent() {
  const session = await auth();
  return <div>User: {session?.user?.email}</div>;
}
```

### Styling

**Tailwind CSS Utility Classes:**
```typescript
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <h2 className="text-xl font-semibold text-gray-900">Title</h2>
  <Button variant="default" size="lg">Click me</Button>
</div>
```

**Using Shadcn UI Components:**
```typescript
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

<div className="space-y-4">
  <Input placeholder="Enter text" />
  <Button>Submit</Button>
</div>
```

**Responsive Design:**
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Content */}
</div>
```

### TypeScript

**Type Definitions:**
```typescript
// types/index.ts
export interface ImageModel {
  id: string;
  name: string;
  model: string;
  description: string;
  provider: string;
  supportsTextToImage?: boolean;
  supportsImageToImage?: boolean;
}

export interface GenerationResult {
  code: number;
  message: string;
  data: {
    id?: string;
    images?: string[];
    progress?: number;
    status?: 'pending' | 'processing' | 'completed' | 'failed';
  };
}
```

**Using Types:**
```typescript
import type { ImageModel } from '@/types';

const models: ImageModel[] = [...];
```

### State Management

**React Context for Global State:**
```typescript
// contexts/app.tsx
export const AppContext = createContext<AppContextType>({...});

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState({...});

  return (
    <AppContext.Provider value={{ state, setState }}>
      {children}
    </AppContext.Provider>
  );
}

// Usage in components
import { useContext } from 'react';
import { AppContext } from '@/contexts/app';

export default function MyComponent() {
  const { state, setState } = useContext(AppContext);
  // ...
}
```

**Local State with useState:**
```typescript
const [isGenerating, setIsGenerating] = useState(false);
const [generatedImage, setGeneratedImage] = useState<string | null>(null);
```

## Environment Variables

### Required Variables

```env
# NextAuth
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_GOOGLE_ID="your-google-client-id.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-your-google-secret"

# Supabase
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### Optional Variables

```env
# AI Providers
EVOLINK_API_KEY="sk-your-evolink-key"
EVOLINK_API_URL="https://api.evolink.ai"

# Web Config
NEXT_PUBLIC_WEB_URL="http://localhost:3006"
NEXT_PUBLIC_PROJECT_NAME="AI Image SaaS"

# Analytics
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID="G-XXXXXXXXXX"
NEXT_PUBLIC_CLARITY_ID="your-clarity-id"

# Payment (Stripe)
STRIPE_PUBLIC_KEY="pk_test_..."
STRIPE_PRIVATE_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### Environment File Priority

1. `.env.local` - Highest priority (gitignored, for local overrides)
2. `.env.production` - Production-specific
3. `.env.development` - Development-specific
4. `.env` - Default values (committed to git)

## Common Patterns

### API Error Handling

```typescript
try {
  const response = await fetch('/api/ai/evolink/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  const result = await response.json();

  if (result.code !== 1000) {
    throw new Error(result.message || 'Generation failed');
  }

  return result.data;
} catch (error: any) {
  console.error('[Generation Error]', error);
  toast.error(error.message || 'An error occurred');
}
```

### Loading States

```typescript
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async () => {
  setIsLoading(true);
  try {
    // Async operation
    await generateImage();
  } finally {
    setIsLoading(false);
  }
};

return (
  <Button disabled={isLoading}>
    {isLoading ? 'Generating...' : 'Generate Image'}
  </Button>
);
```

### Toast Notifications

```typescript
import { toast } from 'sonner';

// Success
toast.success('Image generated successfully');

// Error
toast.error('Failed to generate image');

// Loading (with promise)
toast.promise(generateImage(), {
  loading: 'Generating image...',
  success: 'Image generated!',
  error: 'Generation failed'
});
```

## Adding New AI Providers

### Step-by-Step Guide

**1. Add Environment Variables:**
```env
# .env
YOUR_PROVIDER_API_KEY="your-key"
YOUR_PROVIDER_API_URL="https://api.provider.com"
```

**2. Create Axios Instance:**
```typescript
// lib/axios-config.ts
const yourProviderAxios: AxiosInstance = axios.create({
  baseURL: process.env.YOUR_PROVIDER_API_URL,
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.YOUR_PROVIDER_API_KEY}`
  }
});

export { axiosInstance, aiHubAxios, evolinkAxios, yourProviderAxios };
```

**3. Create API Routes:**
```typescript
// app/api/ai/your-provider/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { yourProviderAxios } from '@/lib/axios-config';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { prompt } = await request.json();
  const response = await yourProviderAxios.post('/generate', { prompt });

  return NextResponse.json({
    code: 1000,
    data: response.data
  });
}
```

**4. Add Model to Configuration:**
```typescript
// app/[locale]/(default)/txt-to-image/[model]/page.tsx
const mockModels: ImageModel[] = [
  {
    id: 'your-model-id',
    name: 'Your Model Name',
    model: 'your-model-id',
    description: 'Model description',
    provider: 'your-provider',
    supportsTextToImage: true,
    supportsImageToImage: false
  },
  // ... existing models
];
```

**5. Add Provider-specific Logic:**
```typescript
// In handleGenerate function
if (model === 'your-model-id') {
  const response = await fetch('/api/ai/your-provider/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  const result = await response.json();
  setGeneratedImage(result.data.imageUrl);
  return;
}
```

**6. Update Route Filtering:**
```typescript
// In model filtering logic
if (routeModel === 'your-provider') {
  return m.provider === 'your-provider' || m.id.includes('your-model');
}
```

## Debugging & Logging

### Console Logging Pattern

```typescript
// Use descriptive prefixes
console.log('[ComponentName] Action description:', data);

// Examples
console.log('[TextToImage] Starting generation with prompt:', prompt);
console.log('[Evolink] Task status:', taskData.status, 'Progress:', taskData.progress);
console.error('[API Error] Generation failed:', error);
```

### Error Handling Best Practices

```typescript
try {
  // Risky operation
} catch (error: any) {
  // Log full error for debugging
  console.error('[Context] Full error:', error);

  // Show user-friendly message
  const userMessage = error.response?.data?.message || error.message || 'An error occurred';
  toast.error(userMessage);

  // Re-throw if needed
  throw error;
}
```

## Important Notes for AI Assistants

### Coding Rules (CRITICAL - MUST FOLLOW)

1. **不要自作聪明瞎写代码** - 写代码前要先确认方案再执行
2. **不要添加冗余代码** - 只做必要的校验，不添加各种无关的校验
3. **精简代码** - 如果已有功能/组件/函数，优先重构和抽象
4. **不要瞎改之前的代码** - 确认改完不会影响其他功能
5. **不要重复造轮子** - 优先使用已有的类似功能
6. **严格按照示例文档** - 有参考文档时严格按照示例写代码
7. **打印清晰的调试日志** - 每个步骤都要打印正确的上下文
8. **不要硬编码可配置信息** - 写到环境变量文件 .env 中
9. **首先考虑快速简单完成任务** - 别搞复杂的东西
10. **不要做任何格式化代码的操作**
11. **不准启动服务，不得占用 3006 端口**
12. **每次写完功能后测试正确性** - 通过 API 调用或网页请求测试
13. **测试正确后清理调试日志等信息**
14. **通过 chrome devtools mcp 调试时禁止关闭用户正在使用的实例** - 启动新的 isolated 实例

### DO:
✅ Read files before modifying them
✅ Use TypeScript types strictly
✅ Follow existing code patterns
✅ Keep changes minimal and focused
✅ Use Shadcn UI components
✅ Implement responsive design
✅ Add proper error handling
✅ Log actions clearly
✅ Use NextAuth for authentication
✅ Put API keys in environment variables

### DON'T:
❌ Add features not requested
❌ Over-engineer solutions
❌ Remove existing functionality without asking
❌ Add unnecessary comments
❌ Expose API keys in client code
❌ Use inline styles (use Tailwind)
❌ Skip error handling
❌ Hardcode environment-specific values
❌ Add emojis unless requested
❌ Format code unnecessarily

## Troubleshooting Common Issues

### 401 Unauthorized Errors
- Check if `session` exists: `const session = await auth();`
- Verify Google OAuth credentials in `.env.local`
- Check if user is logged in: `session?.user`

### Model Not Showing in Dropdown
- Verify model is in `mockModels` array
- Check route parameter matches filtering logic
- Ensure `provider` field is correct
- Check console for filtering logs

### API Route 404 Errors
- Verify route file exists: `app/api/[path]/route.ts`
- Check if route exports `GET`, `POST`, etc.
- Restart Next.js dev server after creating routes

### Environment Variables Not Working
- Restart dev server after changing `.env.local`
- Use `NEXT_PUBLIC_` prefix for client-side variables
- Check if `.env.local` overrides `.env`

### Image Generation Timeout
- Increase `maxAttempts` in polling loop
- Check provider API status
- Verify API key is valid
- Check network connectivity

## Version Information

- **Next.js**: 15.x (App Router)
- **React**: 19.x
- **TypeScript**: Latest
- **Node.js**: 18+
- **Package Manager**: pnpm (recommended)

## Additional Resources

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [NextAuth.js Docs](https://authjs.dev/)
- [Shadcn UI Docs](https://ui.shadcn.com/)
- [Tailwind CSS Docs](https://tailwindcss.com/)
- [next-intl Docs](https://next-intl-docs.vercel.app/)

---

**Last Updated**: 2026-02-03
**Template Version**: 1.0.0
**Maintained for**: Educational purposes and production SaaS applications
