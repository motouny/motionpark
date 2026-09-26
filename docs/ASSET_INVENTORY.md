# Motion Park — Asset Inventory

Date: 2026-09-26
Source: `reference-design/react-vite` (approved design reference)

## Brand Assets

The React reference references its imagery through an external dev-storage proxy (`/manus-storage/…`). **No image binaries ship in the repository.** To guarantee zero broken images in production and no unapproved stock photography, the platform uses locally generated, on-brand SVG artwork + CSS gradients that follow the approved identity (colors, type, composition) exactly.

| Asset | Production location | Notes |
|---|---|---|
| Logo (light) | `frontend/angular/src/assets/brand/logo-light.svg` | Wordmark for dark backgrounds |
| Logo (dark) | `frontend/angular/src/assets/brand/logo-dark.svg` | Wordmark for light backgrounds |
| Brand symbol | `frontend/angular/src/assets/brand/symbol.svg` | Mark/icon used in modals, favicon source |
| Favicon | `frontend/angular/src/assets/brand/favicon.svg` | Derived from symbol |
| Hero visual | CSS/SVG art (gradient + brand shapes) | Matches hero-photo treatment (dark, glow accents) |
| Activity visuals | CSS gradients per activity | swim/group use treated gradients, fitness/football pure CSS (as reference) |

Original reference keys (for traceability only, not used at runtime): `motion-park-logo-light_5c4f496d.svg`, `motion-park-symbol_2f6d1717.svg`, `motion-park-hero_d6dc0ff0.jpg`, `motion-park-swim_f9af127a.jpg`, `motion-park-group_38ef11af.jpg`.

## Runtime Media (CMS uploads)

Runtime uploads live OUTSIDE source control in `/var/www/motionpark/storage/media`, served via the backend media API with Nginx `X-Accel-Redirect`. The admin Media Library manages upload/multi-upload/delete/replace/search/preview + ALT (AR/EN) + title + categorization.

## Typography

- **Tajawal** (400/500/700/800/900) — all Arabic UI/body. Headings `font-weight: 900`.
- **Sora** (400–800) — Latin display (eyebrow labels, English accents).
- Loaded via Google Fonts `@import` in global styles.

## Color Tokens (exact, from reference `:root`)

| Token | Value |
|---|---|
| background | `#121218` |
| foreground | `#F5F5F7` |
| card / popover / secondary / muted | `#24242D` |
| primary / ring | `#FF4081` |
| accent | `#8A2BE2` |
| destructive | `#ef4444` |
| muted-foreground | `#A8A8B3` |
| border / input | `rgba(245,245,247,.12)` |
| light-section bg / fg | `#F5F5F7` / `#1A1A1A` |
| schedule surface | `#17171d` |
| plan card (non-featured) | `#1D1D24` |
| footer | `#0D0D11` |

**Signature gradients**
- Button: `linear-gradient(135deg,#FF7A00 0%,#FF4081 52%,#8A2BE2 100%)`
- Text: `linear-gradient(135deg,#FF9C20,#FF4081 49%,#B149F5)`
- Eyebrow: `#FF9B50` (dark) / `#8A2BE2` (light)
- Radius: 20px base; cards `28px`; buttons pill.

## Content Inventory (Arabic, from reference)

- Hero badge: `مجمع رياضي ورفاهي للنساء والفتيات`; H1 `حركتك.. لحياة أجمل`; sub `مساحتك الآمنة لتتحركي، تكتشفي قوتك، وتبني روتيناً تحبين العودة إليه.`
- Stats: `+25 نشاطاً أسبوعياً`, `+12 مدرّبة متخصصة`, `4.9/5 تقييم العضوات`
- Activities: السباحة/Swimming, اللياقة البدنية/Fitness, كرة القدم النسائية/Football, الأنشطة الجماعية/Group Classes
- Story: H2 `مكان تتحول فيه الحركة إلى انتماء.`; values `خصوصية وراحة`, `مدرّبات متخصصات`, `تنوع يحفزك`, `مجتمع إيجابي`
- Memberships (SAR/month): Motion 299 (8 حصص شهرياً…), **Motion Plus 499 (featured, حصص غير محدودة…)**, Park Signature 799 (جلسات تدريب شخصية…)
- Schedule classes: Pilates Flow / Swim Fundamentals / Strong & Sculpt (coaches نورة، ليان، رُبى)
- Footer: `مجمع رياضي ورفاهي للنساء والفتيات…`, الرياض، `+966 11 000 0000`, `hello@motionpark.sa`

> Reference membership prices are design placeholders. Production prices come ONLY from Odoo-synced plans; seed data marks them clearly as configurable.
