import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PLAN_FEATURES } from '../../core/fallback-data';
import { createLoader } from '../../core/loader';
import { AuthStore } from '../../core/auth.store';
import { I18nService } from '../../i18n/i18n.service';
import { MembershipPlan, PAYMENT_CREDENTIALS_REQUIRED } from '../../models';
import { MembershipService } from '../../services/membership.service';
import { PublicService } from '../../services/public.service';
import { normalizeHttpError } from '../../core/errors';
import { BookingService, newIdempotencyKey } from '../../services/booking.service';
import { EmptyComponent } from '../../shared/empty.component';
import { IconComponent } from '../../shared/icon.component';
import { LoadingComponent } from '../../shared/loading.component';
import { SectionHeadComponent } from '../../shared/section-head.component';
import { ToastService } from '../../shared/toast.service';
import { ErrorStateComponent } from '../../shared/error-state.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DecimalPipe, IconComponent, LoadingComponent, EmptyComponent, ErrorStateComponent, SectionHeadComponent],
  template: `
    <section class="page-band">
      <div class="container">
        <p class="eyebrow">{{ i18n.t('nav.memberships') }}</p>
        <h1>{{ i18n.t('membershipsPage.title') }}</h1>
        <p class="lead">{{ i18n.t('membershipsPage.lead') }}</p>
      </div>
    </section>

    <section class="plans-section">
      <div class="container">
        @if (loader.loading()) {
          <app-loading [label]="i18n.t('common.loading')" />
        } @else if (loader.error()) {
          <app-error-state [message]="i18n.t('common.error')" (retry)="loader.reload()" />
        } @else if (plans().length === 0) {
          <app-empty [message]="i18n.t('membershipsPage.empty')" />
        } @else {
          <div class="tiers">
            @for (plan of plans(); track plan.id) {
              <article class="tier" [class.featured]="plan.featured">
                @if (plan.featured) {
                  <span class="flag">{{ i18n.t('membershipsPage.featuredBadge') }}</span>
                }
                <p class="desc">{{ i18n.pick(plan, 'descriptionAr', 'descriptionEn') }}</p>
                <h3>{{ i18n.pick(plan) }}</h3>
                <div class="price">
                  <strong>{{ plan.price | number: '1.0-0' }}</strong>
                  <span>{{ i18n.t('membershipsPage.perMonth') }}</span>
                </div>
                <ul class="features">
                  @for (f of featuresOf(plan); track f) {
                    <li>
                      <span class="check"><app-icon name="check" size="0.7rem" /></span>
                      {{ f }}
                    </li>
                  }
                </ul>

                @if (paymentPendingId() === plan.id) {
                  <div class="payment-pending" role="status">
                    <app-icon name="alert" size="1.1rem" />
                    <div>
                      <strong>{{ i18n.t('membershipsPage.paymentPendingTitle') }}</strong>
                      <p>{{ i18n.t('membershipsPage.paymentPendingBody') }}</p>
                    </div>
                  </div>
                }

                <button
                  class="choose"
                  [class.gradient-button]="plan.featured"
                  [class.ghost]="!plan.featured"
                  [disabled]="subscribingId() === plan.id"
                  (click)="subscribe(plan)"
                >
                  @if (subscribingId() === plan.id) {
                    {{ i18n.t('common.submitting') }}
                  } @else {
                    {{ i18n.t('membershipsPage.subscribe') }}
                  }
                </button>
              </article>
            }
          </div>
          <p class="odoo-note">
            <app-icon name="refresh" size="0.9rem" />
            {{ i18n.t('homeMemberships.fromOdoo') }}
          </p>
        }
      </div>
    </section>
  `,
  styles: `
    .plans-section { padding: 72px 0 96px; background: var(--background); }
    .tiers {
      display: grid; gap: 1.25rem;
      @media (min-width: 1024px) { grid-template-columns: repeat(3, 1fr); align-items: stretch; }
    }
    .tier {
      position: relative; display: flex; flex-direction: column;
      overflow: hidden; border-radius: 28px; padding: 2rem;
      border: 1px solid rgba(245,245,247,.1); background: var(--plan-card);
      &.featured {
        border-color: rgba(255,64,129,.65);
        background: linear-gradient(145deg, rgba(255,64,129,.17), rgba(138,43,226,.12), rgba(36,36,45,.9));
        box-shadow: 0 24px 64px rgba(255,64,129,.14);
      }
      .flag {
        position: absolute; top: 1.25rem; inset-inline-end: 1.25rem;
        background: var(--primary); color: #fff; border-radius: 9999px;
        padding: .3rem .8rem; font-size: .7rem; font-weight: 900;
      }
      .desc { font-size: .88rem; font-weight: 700; color: rgba(245,245,247,.48); }
      h3 { margin-top: .5rem; font-size: 1.7rem; font-weight: 900; }
      .price { margin-block: 1.75rem; display: flex; align-items: flex-end; gap: .5rem; }
      .price strong { font-size: 3.2rem; font-weight: 900; line-height: 1; letter-spacing: -1px; }
      .price span { margin-bottom: .4rem; font-size: .85rem; color: rgba(245,245,247,.6); }
      .features { display: grid; gap: .9rem; margin-bottom: 2rem; font-size: .92rem; color: rgba(245,245,247,.76); }
      .features li { display: flex; align-items: center; gap: .7rem; }
      .check {
        display: grid; place-items: center;
        width: 1.3rem; height: 1.3rem; border-radius: 50%;
        background: rgba(255,255,255,.1); color: #FF9B50; flex-shrink: 0;
      }
      .choose {
        margin-top: auto;
        display: flex; align-items: center; justify-content: center;
        border-radius: 9999px; padding: .95rem;
        font-size: .92rem; font-weight: 900;
        transition: all 160ms var(--ease-out);
        &:disabled { opacity: .6; cursor: wait; }
        &.ghost { border: 1px solid rgba(245,245,247,.18); &:hover { border-color: var(--primary); background: rgba(245,245,247,.05); } }
      }
    }
    .payment-pending {
      display: flex; gap: .75rem; align-items: flex-start;
      border: 1px solid rgba(251,146,60,.4);
      background: rgba(251,146,60,.08);
      border-radius: 16px; padding: 1rem;
      margin-bottom: 1.25rem;
      color: #fdba74; font-size: .88rem;
      strong { display: block; color: #fff; margin-bottom: .2rem; }
      p { color: rgba(245,245,247,.6); font-size: .8rem; line-height: 1.7; }
    }
    .odoo-note {
      margin-top: 2.5rem; display: flex; align-items: center; justify-content: center; gap: .5rem;
      color: var(--muted-foreground); font-size: .84rem;
    }
  `,
})
export class MembershipsComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly store = inject(AuthStore);
  private readonly publicService = inject(PublicService);
  private readonly membershipService = inject(MembershipService);
  private readonly booking = inject(BookingService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly subscribingId = signal<string | null>(null);
  protected readonly paymentPendingId = signal<string | null>(null);

  protected readonly loader = createLoader<MembershipPlan[]>(() => this.publicService.membershipPlans(), []);
  protected readonly plans = computed(() =>
    [...this.loader.data()].filter((p) => p.active).sort((a, b) => a.sortOrder - b.sortOrder),
  );

  protected featuresOf(plan: MembershipPlan): string[] {
    const fallback = PLAN_FEATURES[plan.slug];
    if (fallback) {
      return this.i18n.lang() === 'ar' ? fallback.featuresAr : fallback.featuresEn;
    }
    const desc = this.i18n.pick(plan, 'descriptionAr', 'descriptionEn');
    return desc ? [desc] : [];
  }

  protected subscribe(plan: MembershipPlan): void {
    if (!this.store.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: `/memberships/${plan.slug}` } }).catch(() => undefined);
      return;
    }
    this.subscribingId.set(plan.id);
    this.paymentPendingId.set(null);
    this.membershipService.subscribe(plan.id, undefined, undefined, newIdempotencyKey()).subscribe({
      next: () => {
        this.subscribingId.set(null);
        this.toast.success(this.i18n.t('common.saved'), this.i18n.pick(plan));
        this.router.navigate(['/account/membership']).catch(() => undefined);
      },
      error: (err: unknown) => {
        this.subscribingId.set(null);
        const apiError = normalizeHttpError(err);
        if (apiError.status === 402 && apiError.code === PAYMENT_CREDENTIALS_REQUIRED) {
          // Payment provider not configured server-side: clear in-UI pending state.
          this.paymentPendingId.set(plan.id);
        } else {
          this.toast.error(apiError.message || this.i18n.t('common.error'));
        }
      },
    });
  }
}
