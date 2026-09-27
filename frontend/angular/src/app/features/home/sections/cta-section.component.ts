import { ChangeDetectionStrategy, Component, Input, inject, signal } from '@angular/core';
import { I18nService } from '../../../i18n/i18n.service';
import { IconComponent } from '../../../shared/icon.component';
import { LeadDialogComponent } from '../../../shared/lead-dialog.component';

@Component({
  selector: 'app-cta-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, LeadDialogComponent],
  template: `
    <section class="cta-band">
      <div class="bg" aria-hidden="true"></div>
      <div class="container inner">
        <div>
          <p class="eyebrow">{{ i18n.t('ctaBand.eyebrow') }}</p>
          <h2>{{ i18n.t('ctaBand.title') }}</h2>
        </div>
        <button class="btn btn-white" (click)="leadOpen.set(true)">
          {{ i18n.t('ctaBand.button') }}
          <app-icon name="arrow-start" size="1.05rem" [flip]="true" />
        </button>
      </div>
    </section>
    <app-lead-dialog [isOpen]="leadOpen()" (close)="leadOpen.set(false)" />
  `,
  styles: `
    .cta-band { position: relative; overflow: hidden; background: var(--primary); padding: 64px 0; }
    .bg {
      position: absolute; inset: 0;
      background:
        radial-gradient(circle at 12% 40%, #FFB000 0, transparent 31%),
        radial-gradient(circle at 88% 15%, #8A2BE2 0, transparent 39%);
    }
    .inner {
      position: relative;
      display: flex; flex-direction: column; align-items: center;
      gap: 2rem; text-align: center;
      @media (min-width: 768px) {
        flex-direction: row; justify-content: space-between; text-align: start;
      }
    }
    .eyebrow { font-size: .88rem; font-weight: 700; color: rgba(255,255,255,.78); margin: 0; }
    h2 { margin-top: .5rem; font-size: clamp(1.6rem, 4vw, 2.3rem); font-weight: 900; color: #fff; }
  `,
})
export class CtaSectionComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly leadOpen = signal(false);

  @Input() content: Record<string, unknown> | null | undefined = null;
}
