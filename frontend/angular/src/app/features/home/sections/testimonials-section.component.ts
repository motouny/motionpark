import { ChangeDetectionStrategy, Component, Input, computed, inject } from '@angular/core';
import { createLoader } from '../../../core/loader';
import { I18nService } from '../../../i18n/i18n.service';
import { Testimonial } from '../../../models';
import { PublicService } from '../../../services/public.service';
import { EmptyComponent } from '../../../shared/empty.component';
import { IconComponent } from '../../../shared/icon.component';
import { LoadingComponent } from '../../../shared/loading.component';
import { SectionHeadComponent } from '../../../shared/section-head.component';

@Component({
  selector: 'app-testimonials-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, LoadingComponent, EmptyComponent, SectionHeadComponent],
  template: `
    <section class="light-surface section">
      <div class="container">
        <app-section-head
          [eyebrow]="i18n.t('homeTestimonials.eyebrow')"
          [description]="i18n.t('homeTestimonials.subtitle')"
          [center]="true"
          [onLight]="true"
        >
          {{ i18n.t('homeTestimonials.title') }}
        </app-section-head>

        @if (loader.loading()) {
          <app-loading [label]="i18n.t('common.loading')" />
        } @else if (items().length === 0) {
          <app-empty message="" />
        } @else {
          <div class="grid">
            @for (t of items(); track t.id) {
              <figure class="quote">
                <div class="stars" [attr.aria-label]="t.rating + '/5'">
                  @for (s of [1, 2, 3, 4, 5]; track s) {
                    <app-icon name="star" size="0.95rem" [class.filled]="s <= t.rating" />
                  }
                </div>
                <blockquote>“{{ i18n.pick(t, 'textAr', 'textEn') }}”</blockquote>
                <figcaption>— {{ t.name }}</figcaption>
              </figure>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .grid {
      margin-top: 3rem;
      display: grid; gap: 1rem;
      @media (min-width: 1024px) { grid-template-columns: repeat(3, 1fr); }
    }
    .quote {
      margin: 0;
      border-radius: 24px; border: 1px solid rgba(26,26,26,.1);
      background: #fff; padding: 1.75rem;
      display: flex; flex-direction: column; gap: 1rem;
    }
    .stars { display: flex; gap: .25rem; color: rgba(26,26,26,.18); }
    .stars .filled { color: #FF9C20; fill: #FF9C20; }
    blockquote {
      margin: 0; font-size: 1rem; line-height: 1.9; color: rgba(26,26,26,.78);
      display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden;
    }
    figcaption { font-size: .88rem; font-weight: 700; color: var(--primary); }
  `,
})
export class TestimonialsSectionComponent {
  protected readonly i18n = inject(I18nService);
  private readonly publicService = inject(PublicService);

  @Input() content: Record<string, unknown> | null | undefined = null;

  protected readonly loader = createLoader<Testimonial[]>(() => this.publicService.testimonials(), []);
  protected readonly items = computed(() => this.loader.data().filter((t) => t.active).slice(0, 3));
}
