import { computed, effect, Injectable, signal } from '@angular/core';
import { Dict, Lang, translations } from './translations';

export type { Lang } from './translations';

const STORAGE_KEY = 'mp.lang';

function resolve(dict: Dict, path: string): string | undefined {
  let node: string | Dict | undefined = dict;
  for (const part of path.split('.')) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Dict)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  /** Current UI language. Default: Arabic. */
  readonly lang = signal<Lang>(this.readInitialLang());

  /** Text direction for the current language. */
  readonly dir = computed<'rtl' | 'ltr'>(() => (this.lang() === 'ar' ? 'rtl' : 'ltr'));

  constructor() {
    effect(() => {
      const lang = this.lang();
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        /* storage unavailable */
      }
    });
  }

  /** Translate a dot-notation key, with `{name}`-style interpolation. */
  t(key: string, params?: Record<string, string | number>): string {
    let value = resolve(translations[this.lang()], key);
    if (value === undefined) {
      value = resolve(translations.ar, key) ?? key;
    }
    if (params) {
      for (const [name, param] of Object.entries(params)) {
        value = value.replaceAll(`{${name}}`, String(param));
      }
    }
    return value;
  }

  /** Pick a localized value from an `xxxAr/xxxEn` pair. */
  pick(value: unknown, arKey = 'nameAr', enKey = 'nameEn'): string {
    if (!value || typeof value !== 'object') return '';
    const record = value as Record<string, unknown>;
    const lang = this.lang();
    const ar = record[arKey];
    const en = record[enKey];
    if (lang === 'en') {
      return (typeof en === 'string' && en ? en : typeof ar === 'string' ? ar : '') as string;
    }
    return (typeof ar === 'string' && ar ? ar : typeof en === 'string' ? en : '') as string;
  }

  setLang(lang: Lang): void {
    this.lang.set(lang);
  }

  toggle(): void {
    this.lang.set(this.lang() === 'ar' ? 'en' : 'ar');
  }

  /** BCP-47 locale for date/number pipes. */
  get locale(): string {
    return this.lang() === 'ar' ? 'ar-SA' : 'en-US';
  }

  private readInitialLang(): Lang {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'ar' || stored === 'en') return stored;
    } catch {
      /* storage unavailable */
    }
    return 'ar';
  }
}
