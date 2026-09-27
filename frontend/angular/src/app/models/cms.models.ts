export interface CmsPage {
  id?: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  seo?: { title?: string; description?: string; keywords?: string } | null;
}

export interface Faq {
  id: string;
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
  sortOrder: number;
  active?: boolean;
}

export interface Testimonial {
  id: string;
  name: string;
  textAr: string;
  textEn: string;
  rating: number;
  active: boolean;
}

export interface Banner {
  id: string;
  titleAr?: string;
  titleEn?: string;
  subtitleAr?: string;
  subtitleEn?: string;
  imageUrl?: string | null;
  ctaTextAr?: string;
  ctaTextEn?: string;
  ctaUrl?: string;
  sortOrder: number;
  active: boolean;
}

/** Ordered, CMS-managed homepage section (type + localized content bag). */
export interface HomepageSection {
  id?: string;
  type: string;
  enabled: boolean;
  sortOrder: number;
  publishedAt?: string | null;
  content?: Record<string, unknown> | null;
}

export interface MediaAsset {
  id: string;
  fileName?: string;
  url?: string;
  mimeType?: string;
  sizeBytes?: number;
  title?: string;
  category?: string;
  altAr?: string;
  altEn?: string;
  createdAt?: string;
}
