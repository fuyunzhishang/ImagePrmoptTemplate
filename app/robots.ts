import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://www.pixmind.io/'

  return {
    rules: [
      // 通用搜索引擎规则
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',              // API路由不索引
          '/admin/',            // 管理后台不索引
          '/auth/',             // 认证页面不索引
          '/*?*session_id=*',   // 支付回调参数
          '/*?*checkout_id=*',  // 支付回调参数
          '/*?*order_no=*',     // 订单参数
          '/?tab=*',            // 旧URL结构，避免重复索引
          '/cdn-cgi/',          // Cloudflare内部路径
          '/$',                 // 异常URL:特殊字符
          '/&',                 // 异常URL:特殊字符
          '/月',                 // 异常URL:中文字符
          '/month',             // 异常URL:订阅周期
          '/year',              // 异常URL:订阅周期
        ],
      },
      // OpenAI GPTBot - ChatGPT的爬虫
      {
        userAgent: 'GPTBot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/auth/',
        ],
      },
      // Google Bard/Gemini 爬虫
      {
        userAgent: 'Google-Extended',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/auth/',
        ],
      },
      // Anthropic Claude 爬虫
      {
        userAgent: 'ClaudeBot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/auth/',
        ],
      },
      // Common Crawl (为AI训练提供数据)
      {
        userAgent: 'CCBot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/auth/',
        ],
      },
      // Perplexity AI
      {
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/auth/',
        ],
      },
      // Meta AI
      {
        userAgent: 'FacebookBot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/auth/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
