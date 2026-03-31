import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TryNowButton } from "./try-now-button";
import { EffectsSection } from "./effects-section";
import { VideoCarousel } from "./video-carousel";
import { FAQSection } from "./faq-section";

export const metadata: Metadata = {
  title: "Image to Prompt Generator - AI图像转提示词生成器 | 免费在线工具",
  description: "最强大的AI图像转提示词生成器。将任何图片转换为详细的AI提示词，支持Midjourney、DALL-E、Stable Diffusion等。免费的image to prompt在线工具。",
};

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("homepage");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-purple-50 dark:to-purple-950/20">
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-[2.7rem] md:text-6xl font-bold mb-6 text-foreground">
            {t("hero.title_main")}
          </h1>

          <p className="text-lg text-muted-foreground mb-4">
            {t("hero.subtitle")}
          </p>
          <p className="text-lg text-muted-foreground mb-10">
            {t("hero.description")}
          </p>

          <div className="flex justify-center gap-4 mb-16">
            <TryNowButton locale={locale} label={t("hero.try_now")} />
            <Link href={`/${locale}/blog`}>
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-6 text-lg rounded-full border-2"
              >
                {t("hero.tutorials")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* AI Video Effects Showcase Section */}
      <EffectsSection locale={locale} />

      {/* Feature Showcase Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Card 1: AI-Powered Photo Editing */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="grid md:grid-cols-2 gap-8 p-8 md:p-12 items-center">
              <div className="relative rounded-xl overflow-hidden">
                <img
                  src="https://chatmix.top/pixmind/index_image_demo2.webp"
                  alt={t("showcase.card1.title")}
                  width={543}
                  height={362}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  {t("showcase.card1.title")}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("showcase.card1.description")}
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-sm">
                      01
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{t("showcase.card1.feature1_title")}</h3>
                      <p className="text-xs text-muted-foreground">{t("showcase.card1.feature1_desc")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-sm">
                      02
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{t("showcase.card1.feature2_title")}</h3>
                      <p className="text-xs text-muted-foreground">{t("showcase.card1.feature2_desc")}</p>
                    </div>
                  </div>
                </div>
                <Button
                  size="default"
                  className="rounded-full px-6"
                >
                  {t("showcase.card1.start_creating")}
                </Button>
              </div>
            </div>
          </div>

          {/* Card 2: Create Videos from Text or Images */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="grid md:grid-cols-2 gap-8 p-8 md:p-12 items-center">
              <div className="space-y-6 md:order-1 order-2">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                  {t("showcase.card2.title")}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {t("showcase.card2.description")}
                </p>
                <Link href={`/${locale}/text-to-video`}>
                  <Button
                    size="lg"
                    className="rounded-full px-8"
                  >
                    {t("showcase.card2.start_creating")}
                  </Button>
                </Link>
              </div>
              <div className="relative aspect-[3/2] rounded-xl overflow-hidden md:order-2 order-1">
                <VideoCarousel />
              </div>
            </div>
          </div>

          {/* Card 3: Easy AI Image Generation */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="grid md:grid-cols-2 gap-8 p-8 md:p-12 items-center">
              <div className="relative aspect-[3/2] rounded-xl overflow-hidden">
                <img
                  src="https://chatmix.top/pixmind/index_image_demo3.png"
                  alt={t("showcase.card3.title")}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                  {t("showcase.card3.title")}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {t("showcase.card3.description")}
                </p>
                <Link href={`/${locale}/text-to-image`}>
                  <Button
                    size="lg"
                    className="rounded-full px-8"
                  >
                    {t("showcase.card3.start_creating")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center bg-card border border-border rounded-2xl p-8 md:p-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            {t("cta.title")}
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            {t("cta.description")}
          </p>
          <a
            href="https://www.pixmind.io/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="lg" className="rounded-full px-8">
              {t("cta.button")}
            </Button>
          </a>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQSection
        title={t("faq.title")}
        faqs={[
          {
            question: t("faq.q1_question"),
            answer: t("faq.q1_answer"),
          },
          {
            question: t("faq.q2_question"),
            answer: t("faq.q2_answer"),
          },
          {
            question: t("faq.q3_question"),
            answer: t("faq.q3_answer"),
          },
          {
            question: t("faq.q4_question"),
            answer: t("faq.q4_answer"),
          },
        ]}
      />
    </div>
  );
}