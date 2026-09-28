import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService, Lang } from '../i18n/i18n.service';

/** Formats a SAR price with locale grouping + currency label. */
@Pipe({ name: 'sar', standalone: true })
export class SarPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(value: number | null | undefined, lang?: Lang): string {
    void lang;
    const amount = typeof value === 'number' ? value : Number(value ?? 0);
    const formatted = new Intl.NumberFormat(this.i18n.lang() === 'ar' ? 'ar-SA' : 'en-US', {
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
    return `${formatted} ${this.i18n.t('common.currency')}`;
  }
}
