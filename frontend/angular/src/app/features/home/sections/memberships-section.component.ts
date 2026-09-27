import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PLAN_FEATURES } from '../../../core/fallback-data';
import { createLoader } from '../../../core/loader';
import { I18nService } from '../../../i18n/i18n.service';
import { MembershipPlan } from '../../../models';
import { PublicService } from '../../../services/public.service';
import { IconComponent } from '../../../shared/icon.component';
import { LoadingComponent } from '../../../shared/loading.component';
import { EmptyComponent } from '../../../shared/empty.component';
import { SectionHeadComponent } from '../../../shared/section-head.component';

@Component({
  selector: 'app-memberships-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DecimalPipe, IconComponent, LoadingComponent, EmptyComponent, SectionHeadComponent],
  template: `
    <section id="membership" class="section memberships">
      <div class="container">
        <app-section-head
          [eyebrow]="i18n.t('homeMemberships.eyebrow')"
          [description]="i18n.t('homeMemberships.subtitle')"
          [center]="true"
        >
          {{ i18n.t('homeMemberships.title') }}
        </app-section-head>

        @if (loader.loading()) {
          <app-loading [label]="i18n.t('common.loading')" />
        } @else if (plans().length === 0) {
          <app-empty [message]="i18n.t('membershipsPage.empty')" />
        } @else {
          <div class="tiers">
            @for (plan of plans(); track plan.id) {
              <article class="tier" [class.featured]="plan.featured">
                @if (plan.featured) {
                  <span class="flag">{{ i18n.t('homeMemberships.mostPopular') }}</span>
                }
                <p class="desc">{{ i18n.pick(plan, 'descriptionAr', 'descriptionEn') }}</p>
                <h3>{{ i18n.pick(plan) }}</h3>
                <div class="price">
                  <strong>{{ plan.price | number: '1.0-0' }}</strong>
                  <span>{{ i18n.t('homeMemberships.perMonth') }}</span>
                </div>
                <ul class="features">
                  @for (f of featuresOf(plan); track f) {
                    <li>
                      <span class="check"><app-icon name="check" size="0.7rem" /></span>
                      {{ f }}
                    </li>
                  }
                </ul>
                <a
                  [routerLink]="['/memberships', plan.slug]"
                  class="choose"
                  [class.gradient-button]="plan.featured"
                  [class.ghost]="!plan.featured"
                >
                  {{ i18n.t('homeMemberships.choose') }}
                </a>
              </article>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .memberships { background: var(--background); }
    .tiers {
      margin-top: 3rem;
      display: grid; gap: 1rem;
      @media (min-width: 1024px) { grid-template-columns: repeat(3, 1fr); align-items: stretch; }
    }
    .tier {
      position: relative;
      display: flex; flex-direction: column;
      overflow: hidden;
      border-radius: 28px; border: 1px solid rgba(245,245,247,.1);
      background: var(--plan-card);
      padding: 1.75rem;

      &.featured {
        border-color: rgba(255,64,129,.65);
        background: linear-gradient(145deg, rgba(255,64,129,.17), rgba(138,43,226,.12), rgba(36,36,45,.9));
        box-shadow: 0 24px 64px rgba(255,64,129,.14);
      }
      .flag {
        position: absolute; top: 1.25rem; inset-inline-end: 1.25rem;
        background: var(--primary); color: #fff;
        border-radius: 9999px; padding: .3rem .8rem;
        font-size: .7rem; font-weight: 900;
      }
      .desc { font-size: .88rem; font-weight: 700; color: rgba(245,245,247,.48); }
      h3 { margin-top: .5rem; font-size: 1.6rem; font-weight: 900; }
      .price {
        margin-block: 1.75rem;
        display: flex; align-items: flex-end; gap: .5rem;
        strong { font-size: 3rem; font-weight: 900; letter-spacing: -1px; line-height: 1; }
        span { margin-bottom: .35rem; font-size: .85rem; color: rgba(245,245,247,.6); }
      }
      .features { display: grid; gap: .9rem; margin-bottom: 2rem; font-size: .9rem; color: rgba(245,245,247,.76); }
      .features li { display: flex; align-items: center; gap: .7rem; }
      .check {
        display: grid; place-items: center;
        width: 1.3rem; height: 1.3rem; border-radius: 50%;
        background: rgba(255,255,255,.1); color: #FF9B50; flex-shrink: 0;
      }
      .choose {
        margin-top: auto;
        display: flex; align-items: center; justify-content: center;
        border-radius: 9999px; padding: .9rem;
        font-size: .9rem; font-weight: 900;
        transition: all 160ms var(--ease-out);
        &.ghost { border: 1px solid rgba(245,245,247,.18); &:hover { border-color: var(--primary); background: rgba(245,245,247,.05); } }
      }
    }
  `,
})
export class MembershipsSectionComponent {
  protected readonly i18n = inject(I18nService);
  private readonly publicService = inject(PublicService);

  @Input() content: Record<string, unknown> | null | undefined = null;

  protected readonly loader = createLoader<MembershipPlan[]>(() => this.publicService.membershipPlans(), []);
  protected readonly plans = computed(() =>
    this.loader.data().filter((p) => p.active).sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 3),
  );

  protected featuresOf(plan: MembershipPlan): string[] {
    const fallback = PLAN_FEATURES[plan.slug];
    if (fallback) {
      return this.i18n.lang() === 'ar' ? fallback.featuresAr : fallback.featuresEn;
    }
    const desc = this.i18n.pick(plan, 'descriptionAr', 'descriptionEn');
    return desc ? [desc] : [];
  }
}
