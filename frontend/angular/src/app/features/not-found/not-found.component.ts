import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { IconComponent } from '../../shared/icon.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <section class="nf">
      <div class="code" aria-hidden="true">404</div>
      <h1>{{ i18n.t('common.notFoundTitle') }}</h1>
      <p>{{ i18n.t('common.notFoundBody') }}</p>
      <a routerLink="/" class="btn gradient-button">
        {{ i18n.t('common.backHome') }}
      </a>
    </section>
  `,
  styles: `
    .nf {
      min-height: 80vh; display: grid; place-items: center; align-content: center;
      gap: 1rem; text-align: center; padding: 120px 20px 80px;
      background: var(--background);
    }
    .code {
      font-family: 'Sora', sans-serif; font-size: clamp(5rem, 18vw, 9rem); font-weight: 800; line-height: 1;
      background: var(--gradient-text);
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    h1 { font-size: 1.5rem; font-weight: 900; }
    p { color: var(--muted-foreground); max-width: 420px; }
    .btn { margin-top: 1rem; }
  `,
})
export class NotFoundComponent {
  protected readonly i18n = inject(I18nService);
}
