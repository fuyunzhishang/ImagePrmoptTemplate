# Pixmind AI Agent SaaS Template Rebrand Design

**Date**: 2026-03-31
**Goal**: Rebrand the project to "Pixmind AI Agent SaaS Template", drive traffic to https://www.pixmind.io/, and improve Pixmind's SEO authority through backlinks and CTA placements.

## 1. README.md Rewrite

### Structure
1. **Top banner**: Official website link `https://www.pixmind.io/`
2. **Title**: Pixmind AI Agent SaaS Template
3. **Description**: Keep existing feature descriptions unchanged
4. **Open Source vs Commercial**: New section explaining open-source version, commercial version upsell, and agency/reseller program
5. **Quick Start**: Keep existing content
6. **All other sections**: Keep as-is, update project name references
7. **Footer**: "Powered by [Pixmind](https://www.pixmind.io/)" link

### Open Source vs Commercial Section Content
- Explain this is the open-source version
- Commercial version offers more features (contact for details)
- Agency/reseller program available for non-technical users who want to distribute
- All CTAs link to https://www.pixmind.io/

## 2. Brand Unification

### Files to modify

| File | Change |
|------|--------|
| `package.json` | `name` -> `pixmind-ai-agent-saas-template` |
| `.env.example` | Header comment + `NEXT_PUBLIC_PROJECT_NAME` default -> `Pixmind AI Agent` |
| `components/blocks/header/index.tsx` | `alt="ImagetoPrompt"` -> `alt="Pixmind"` (all occurrences) |
| `i18n/messages/en.json` | `metadata.title` -> `Pixmind AI Agent - AI Image Generation & Analysis Platform` |
| `i18n/messages/zh.json` | `metadata.title` -> `Pixmind AI Agent - AI图像生成与分析平台` |
| `app/robots.ts` | Default baseUrl -> `https://www.pixmind.io/` |
| `app/sitemap.ts` | Default baseUrl -> `https://www.pixmind.io/` |
| `CLAUDE.md` | Project description -> Pixmind AI Agent SaaS Template |

## 3. Page CTA for Traffic Driving

### 3.1 Header Navigation - "Official Site" Link
- Add a nav item in header linking to https://www.pixmind.io/
- Text: "Official Site" (en) / "官网" (zh)
- Opens in new tab
- Implementation: This depends on how header nav is configured (from page service data). We add it in the header component as a hardcoded link alongside dynamic nav items.

### 3.2 CTA Card on Landing Page
- Place after features section on the landing page
- Card content:
  - Title: "Need More Features?" / "需要更多功能？"
  - Description: Brief mention of commercial version and agency program
  - CTA button: "Visit Pixmind" -> https://www.pixmind.io/
- Subtle design, not intrusive

### 3.3 Powered by Watermark in Footer
- Add "Powered by [Pixmind](https://www.pixmind.io/)" link
- Placed next to copyright text in footer component
- Small text, muted color

## 4. SEO Configuration

- `robots.ts` default URL: `https://www.pixmind.io/`
- `sitemap.ts` default URL: `https://www.pixmind.io/`
- Meta title includes "Pixmind AI Agent" branding
- Open Graph metadata references pixmind.io where applicable

## 5. Files NOT Changed

- Functionality code (API routes, AI integration, auth, etc.)
- Translation content for features (hero, features descriptions, etc.)
- Styling/theme
- Any code logic

## Scope Boundaries

This is a **branding and marketing** change only. No new features, no refactoring, no architectural changes.
