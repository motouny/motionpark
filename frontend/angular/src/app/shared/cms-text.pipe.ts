import { Injectable, Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService, Lang } from '../i18n/i18n.service';

/**
 * Reads a localized CMS content field: `{{ content | cms:'title' }}`
 * resolves `titleAr`/`titleEn` from the CMS content bag, with an optional
 * fallback when the CMS value is missing.
 */
@Injectable({ providedIn: 'root' })
@Pipe({ name: 'cms', standalone: true })
export class CmsTextPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(content: unknown, key: string, fallback = '', lang?: Lang): string {
    void lang;
    if (!content || typeof content !== 'object') return fallback;
    const bag = content as Record<string, unknown>;
    const ar = bag[`${key}Ar`];
    const en = bag[`${key}En`];
    if (this.i18n.lang() === 'en') {
      return typeof en === 'string' && en ? en : typeof ar === 'string' && ar ? ar : fallback;
    }
    return typeof ar === 'string' && ar ? ar : typeof en === 'string' && en ? en : fallback;
  }
}
