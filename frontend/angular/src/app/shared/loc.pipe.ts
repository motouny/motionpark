import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService, Lang } from '../i18n/i18n.service';

/**
 * Localizes an `xxxAr/xxxEn` pair: `{{ plan | loc }}` or `{{ plan | loc:'titleAr':'titleEn' }}`.
 * Pass the current lang as the final argument so the pure pipe re-evaluates on switch.
 */
@Pipe({ name: 'loc', standalone: true })
export class LocPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(value: unknown, arKey = 'nameAr', enKey = 'nameEn', lang?: Lang): string {
    void lang;
    if (value === null || typeof value !== 'object') return typeof value === 'string' ? value : '';
    const record = value as Record<string, unknown>;
    const ar = record[arKey];
    const en = record[enKey];
    if (this.i18n.lang() === 'en') {
      return typeof en === 'string' && en ? en : typeof ar === 'string' ? ar : '';
    }
    return typeof ar === 'string' && ar ? ar : typeof en === 'string' ? en : '';
  }
}
