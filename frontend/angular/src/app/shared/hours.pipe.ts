import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService, Lang } from '../i18n/i18n.service';
import { OperatingHours } from '../models';

/** Normalize branch operating hours: the API sends `{ ar, en }` (admin sends the raw jsonb string); fallback data is plain text. */
export function parseHours(value: OperatingHours | null | undefined): { ar: string; en: string } {
  if (!value) return { ar: '', en: '' };
  let v: unknown = value;
  if (typeof v === 'string') {
    const text = v.trim();
    if (!text.startsWith('{')) return { ar: text, en: text };
    try { v = JSON.parse(text); } catch { return { ar: text, en: text }; }
  }
  const record = (v ?? {}) as Record<string, unknown>;
  const str = (x: unknown) => (typeof x === 'string' ? x : '');
  return { ar: str(record['ar']), en: str(record['en']) };
}

/** `{{ branch.operatingHours | hours:i18n.lang() }}` */
@Pipe({ name: 'hours', standalone: true })
export class HoursPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(value: OperatingHours | null | undefined, lang?: Lang): string {
    const { ar, en } = parseHours(value);
    return (lang ?? this.i18n.lang()) === 'en' ? en || ar : ar || en;
  }
}
