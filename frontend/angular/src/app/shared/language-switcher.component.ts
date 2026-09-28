import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-language-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <button
      type="button"
      class="lang-switch"
      (click)="i18n.toggle()"
      [attr.aria-label]="i18n.t('common.language')"
    >
      <app-icon name="globe" size="1rem" />
      <span>{{ otherLabel() }}</span>
    </button>
  `,
  styles: `
    .lang-switch {
      display: inline-flex;
      align-items: center;
      gap: .4rem;
      border-radius: 9999px;
      border: 1px solid rgba(245, 245, 247, .18);
      background: rgba(245, 245, 247, .05);
      color: #F5F5F7;
      padding: .45rem .9rem;
      font-size: .82rem;
      font-weight: 700;
      font-family: 'Sora', 'Tajawal', sans-serif;
      transition: background 160ms var(--ease-out);

      &:hover { background: rgba(245, 245, 247, .12); }
    }
  `,
})
export class LanguageSwitcherComponent {
  protected readonly i18n = inject(I18nService);

  readonly otherLabel = computed(() => (this.i18n.lang() === 'ar' ? 'EN' : 'عربي'));
}
