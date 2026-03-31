import { MetadataRoute } from 'next'
import { locales } from '@/i18n/locale'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://www.pixmind.io'

  // 静态页面列表
  const staticPages = [
    { path: '', priority: 1.0, changeFrequency: 'daily' as const },              // 首页
    { path: '/pricing', priority: 0.9, changeFrequency: 'weekly' as const },     // 定价
    { path: '/showcase', priority: 0.8, changeFrequency: 'weekly' as const },    // 展示
    { path: '/blog', priority: 0.8, changeFrequency: 'daily' as const },         // 博客
    { path: '/about', priority: 0.7, changeFrequency: 'monthly' as const },      // 关于
    { path: '/contact', priority: 0.7, changeFrequency: 'monthly' as const },    // 联系
    { path: '/affiliate-program', priority: 0.7, changeFrequency: 'monthly' as const }, // 联盟计划
    { path: '/developer/api', priority: 0.6, changeFrequency: 'monthly' as const },     // 开发者API
    { path: '/image-to-prompt', priority: 0.9, changeFrequency: 'weekly' as const },    // 图片转提示词
    { path: '/image-to-image', priority: 0.8, changeFrequency: 'weekly' as const },     // 图片转图片
    { path: '/text-to-prompt', priority: 0.8, changeFrequency: 'weekly' as const },     // 文本转提示词
    { path: '/txt-to-image', priority: 0.8, changeFrequency: 'weekly' as const },       // 文本转图片
    { path: '/video-generate', priority: 0.8, changeFrequency: 'weekly' as const },     // 视频生成
    { path: '/video-to-prompt', priority: 0.8, changeFrequency: 'weekly' as const },    // 视频转提示词
  ]

  // 为每种语言生成URL
  const urls: MetadataRoute.Sitemap = []

  for (const locale of locales) {
    for (const page of staticPages) {
      const path = locale === 'en' ? page.path : `/${locale}${page.path}`
      const url = `${baseUrl}${path || '/'}`

      urls.push({
        url,
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: {
          languages: Object.fromEntries(
            locales.map(loc => [
              loc,
              `${baseUrl}${loc === 'en' ? page.path : `/${loc}${page.path}`}`
            ])
          )
        }
      })
    }
  }

  // TODO: 未来可以添加动态博客文章
  // const posts = await getAllPosts()
  // for (const post of posts) {
  //   for (const locale of locales) {
  //     const path = locale === 'en' ? `/posts/${post.slug}` : `/${locale}/posts/${post.slug}`
  //     urls.push({
  //       url: `${baseUrl}${path}`,
  //       lastModified: new Date(post.updatedAt),
  //       changeFrequency: 'monthly',
  //       priority: 0.6,
  //     })
  //   }
  // }

  return urls
}
