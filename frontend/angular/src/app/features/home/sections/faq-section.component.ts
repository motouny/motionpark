import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { createLoader } from '../../../core/loader';
import { I18nService } from '../../../i18n/i18n.service';
import { Faq } from '../../../models';
import { PublicService } from '../../../services/public.service';
import { EmptyComponent } from '../../../shared/empty.component';
import { IconComponent } from '../../../shared/icon.component';
import { LoadingComponent } from '../../../shared/loading.component';
import { SectionHeadComponent } from '../../../shared/section-head.component';

@Component({
  selector: 'app-faq-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, LoadingComponent, EmptyComponent, SectionHeadComponent],
  template: `
    <section class="section faq">
      <div class="container narrow">
        <app-section-head [eyebrow]="i18n.t('homeFaq.eyebrow')" [center]="true">
          {{ i18n.t('homeFaq.title') }}
        </app-section-head>

        @if (loader.loading()) {
          <app-loading [label]="i18n.t('common.loading')" />
        } @else if (items().length === 0) {
          <app-empty message="" />
        } @else {
          <div class="accordion">
            @for (faq of items(); track faq.id) {
              <div class="item">
                <button
                  class="question"
                  [attr.aria-expanded]="openId() === faq.id"
                  [attr.aria-controls]="'faq-' + faq.id"
                  (click)="toggle(faq.id)"
                >
                  <span>{{ i18n.pick(faq, 'questionAr', 'questionEn') }}</span>
                  <app-icon [name]="openId() === faq.id ? 'chevron-up' : 'chevron-down'" size="1.1rem" />
                </button>
                @if (openId() === faq.id) {
                  <div class="answer" [id]="'faq-' + faq.id">
                    <p>{{ i18n.pick(faq, 'answerAr', 'answerEn') }}</p>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .faq { background: var(--background); }
    .narrow { max-width: 820px; }
    .accordion { margin-top: 3rem; display: grid; gap: .75rem; }
    .item { border: 1px solid var(--border); border-radius: 18px; background: var(--card); overflow: hidden; }
    .question {
      width: 100%;
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
      padding: 1.15rem 1.4rem;
      font-weight: 700; font-size: .98rem; text-align: start;
      &:hover { color: var(--primary); }
    }
    .answer { padding: 0 1.4rem 1.25rem; color: rgba(245,245,247,.65); line-height: 1.9; font-size: .92rem; }
  `,
})
export class FaqSectionComponent {
  protected readonly i18n = inject(I18nService);
  private readonly publicService = inject(PublicService);

  @Input() content: Record<string, unknown> | null | undefined = null;

  protected readonly openId = signal<string | null>(null);
  protected readonly loader = createLoader<Faq[]>(() => this.publicService.faqs(), []);
  protected readonly items = computed(() => [...this.loader.data()].sort((a, b) => a.sortOrder - b.sortOrder));

  protected toggle(id: string): void {
    this.openId.set(this.openId() === id ? null : id);
  }
}
