import { DatePipe, DecimalPipe } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, inject, Injector, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PLAN_FEATURES } from '../../core/fallback-data';
import { createLoader } from '../../core/loader';
import { normalizeHttpError } from '../../core/errors';
import { AuthStore } from '../../core/auth.store';
import { I18nService } from '../../i18n/i18n.service';
import { MembershipPlan, PAYMENT_CREDENTIALS_REQUIRED } from '../../models';
import { BookingService, newIdempotencyKey } from '../../services/booking.service';
import { MembershipService } from '../../services/membership.service';
import { PaymentService } from '../../services/payment.service';
import { PublicService } from '../../services/public.service';
import { IconComponent } from '../../shared/icon.component';
import { LoadingComponent } from '../../shared/loading.component';
import { ToastService } from '../../shared/toast.service';
import { ErrorStateComponent } from '../../shared/error-state.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, DecimalPipe, IconComponent, LoadingComponent, ErrorStateComponent],
  template: `
    @if (loader.loading()) {
      <div style="min-height: 60vh; display: grid; place-items: center;"><app-loading /></div>
    } @else if (!plan()) {
      <section class="page-band"><div class="container"><app-error-state [message]="i18n.t('common.notFoundBody')" [showRetry]="false" /></div></section>
    } @else {
      <section class="detail-band">
        <div class="glow" aria-hidden="true"></div>
        <div class="container inner">
          <a routerLink="/memberships" class="back-link">
            <app-icon name="arrow-start" size="1rem" />
            {{ i18n.t('nav.memberships') }}
          </a>
          <div class="plan-head">
            <div>
              <span class="latin">{{ i18n.pick(plan(), 'nameEn', 'nameAr') }}</span>
              <h1>{{ i18n.pick(plan()) }}</h1>
              <p class="lead">{{ i18n.pick(plan(), 'descriptionAr', 'descriptionEn') }}</p>
            </div>
            <div class="price-card">
              <strong>{{ plan()!.price | number: '1.0-0' }}</strong>
              <span>{{ i18n.t('membershipsPage.perMonth') }}</span>
              <small>{{ i18n.t('membershipsPage.vatIncluded') }}</small>
            </div>
          </div>
        </div>
      </section>

      <section class="body-section">
        <div class="container cols">
          <div class="card inc">
            <h2>{{ i18n.t('membershipsPage.includes') }}</h2>
            <ul class="features">
              @for (f of featuresOf(plan()!); track f) {
                <li>
                  <span class="check"><app-icon name="check" size="0.75rem" /></span>
                  {{ f }}
                </li>
              }
              <li>
                <span class="check"><app-icon name="check" size="0.75rem" /></span>
                {{ durationLabel(plan()!) }}
              </li>
            </ul>

            @if (paymentPending()) {
              <div class="payment-pending" role="status">
                <app-icon name="alert" size="1.1rem" />
                <div>
                  <strong>{{ i18n.t('membershipsPage.paymentPendingTitle') }}</strong>
                  <p>{{ i18n.t('membershipsPage.paymentPendingBody') }}</p>
                </div>
              </div>
            }

            @if (showPaymentForm()) {
              <div class="payment-form">
                <h3>{{ i18n.t('membershipsPage.payTitle') }}</h3>
                <p class="secure"><app-icon name="check" size="0.8rem" /> {{ i18n.t('membershipsPage.paySecure') }}</p>
                @if (testMode()) {
                  <p class="test-mode" role="note">
                    <app-icon name="alert" size="0.9rem" />
                    <span>{{ i18n.t('membershipsPage.payTestMode') }}
                      <a href="https://docs.moyasar.com/guides/card-payments/test-cards" target="_blank" rel="noopener">{{ i18n.t('membershipsPage.payTestCards') }}</a></span>
                  </p>
                }
                <div id="moyasar-form" class="mysr-form"></div>
              </div>
            } @else {
              <button class="btn gradient-button btn-block" [disabled]="subscribing()" (click)="subscribe(plan()!)">
                @if (subscribing()) {
                  {{ i18n.t('common.submitting') }}
                } @else {
                  {{ i18n.t('membershipsPage.subscribe') }}
                }
              </button>
            }
          </div>

          <div class="card side">
            <h3>{{ i18n.t('membershipsPage.branchesLabel') }}</h3>
            @if (plan()!.branches.length === 0) {
              <p class="muted">{{ i18n.t('branchesPage.empty') }}</p>
            } @else {
              <ul class="ref-list">
                @for (b of plan()!.branches; track b.id) {
                  <li><app-icon name="map-pin" size="0.95rem" /> {{ i18n.pick(b) }}</li>
                }
              </ul>
            }
            <h3>{{ i18n.t('membershipsPage.activitiesLabel') }}</h3>
            @if (plan()!.activities.length === 0) {
              <p class="muted">{{ i18n.t('activitiesPage.empty') }}</p>
            } @else {
              <ul class="ref-list">
                @for (a of plan()!.activities; track a.id) {
                  <li><app-icon name="sparkles" size="0.95rem" /> {{ i18n.pick(a) }}</li>
                }
              </ul>
            }
          </div>
        </div>
      </section>
    }
  `,
  styles: `
    .detail-band {
      position: relative; overflow: hidden;
      padding: 150px 0 72px;
      background:
        radial-gradient(circle at 78% 30%, rgba(255,64,129,.2), transparent 40%),
        radial-gradient(circle at 60% 75%, rgba(138,43,226,.18), transparent 40%),
        var(--background);
      .glow { position: absolute; inset-inline-end: -6rem; top: 8rem; width: 20rem; height: 20rem; border-radius: 50%; background: rgba(138,43,226,.14); filter: blur(90px); }
    }
    .inner { position: relative; }
    .back-link { display: inline-flex; align-items: center; gap: .5rem; font-size: .88rem; font-weight: 700; color: rgba(245,245,247,.6); &:hover { color: #fff; } }
    .plan-head { margin-top: 1.75rem; display: flex; flex-wrap: wrap; gap: 2rem; justify-content: space-between; align-items: flex-end; }
    .latin {
      font-family: 'Sora', sans-serif; font-size: .72rem; font-weight: 800;
      text-transform: uppercase; letter-spacing: .16em; color: #FF9B50;
    }
    h1 { margin-top: .5rem; font-size: clamp(2.2rem, 6vw, 3.2rem); font-weight: 900; }
    .lead { margin-top: .75rem; color: rgba(245,245,247,.68); }
    .price-card {
      border-radius: 24px; border: 1px solid rgba(255,64,129,.4);
      background: rgba(255,64,129,.08);
      padding: 1.5rem 2rem; text-align: center;
      strong { display: block; font-size: 2.6rem; font-weight: 900; line-height: 1; }
      span { display: block; margin-top: .4rem; font-size: .85rem; color: rgba(245,245,247,.7); }
      small { display: block; margin-top: .4rem; font-size: .72rem; color: var(--muted-foreground); }
    }
    .body-section { padding: 72px 0 96px; background: var(--background); }
    .cols { display: grid; gap: 1.5rem; @media (min-width: 1024px) { grid-template-columns: 1.2fr .8fr; align-items: start; } }
    .card { padding: 2rem; }
    h2 { font-size: 1.3rem; font-weight: 900; margin-bottom: 1.25rem; }
    h3 { font-size: 1rem; font-weight: 800; margin-bottom: .8rem; }
    .features { display: grid; gap: .9rem; margin-bottom: 1.75rem; }
    .features li { display: flex; align-items: center; gap: .7rem; font-size: .95rem; color: rgba(245,245,247,.8); }
    .check { display: grid; place-items: center; width: 1.4rem; height: 1.4rem; border-radius: 50%; background: rgba(255,255,255,.1); color: #FF9B50; flex-shrink: 0; }
    .payment-pending {
      display: flex; gap: .75rem; align-items: flex-start;
      border: 1px solid rgba(251,146,60,.4); background: rgba(251,146,60,.08);
      border-radius: 16px; padding: 1rem; margin-bottom: 1.25rem;
      color: #fdba74; font-size: .88rem;
      strong { display: block; color: #fff; margin-bottom: .2rem; }
      p { color: rgba(245,245,247,.6); font-size: .8rem; line-height: 1.7; }
    }
    .payment-form {
      h3 { margin-bottom: .35rem; }
      .secure { display: flex; align-items: center; gap: .4rem; font-size: .8rem; color: var(--muted-foreground); margin-bottom: 1rem; }
      .test-mode {
        display: flex; gap: .5rem; align-items: flex-start; margin-bottom: 1rem; padding: .75rem 1rem;
        border-radius: 12px; border: 1px dashed rgba(251,146,60,.6); background: rgba(251,146,60,.08);
        color: #fdba74; font-size: .82rem; line-height: 1.7;
        a { color: #fff; text-decoration: underline; }
      }
      .mysr-form { background: #fff; border-radius: 16px; padding: 1rem; color: #111; }
    }
    .side .muted { color: var(--muted-foreground); font-size: .88rem; margin-bottom: 1.25rem; }
    .ref-list { display: grid; gap: .6rem; margin-bottom: 1.5rem; }
    .ref-list li { display: flex; align-items: center; gap: .55rem; color: rgba(245,245,247,.75); font-size: .9rem; }
  `,
})
export class MembershipDetailComponent {
  protected readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  private readonly publicService = inject(PublicService);
  private readonly membershipService = inject(MembershipService);
  private readonly booking = inject(BookingService);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly payments = inject(PaymentService);
  private readonly injector = inject(Injector);

  protected readonly subscribing = signal(false);
  protected readonly paymentPending = signal(false);
  protected readonly showPaymentForm = signal(false);
  /** Moyasar test keys (pk_test_…): only test cards work and nobody is charged. */
  protected readonly testMode = signal(false);

  private readonly slug = signal(this.route.snapshot.paramMap.get('slug') ?? '');
  protected readonly loader = createLoader(() => this.publicService.membershipPlans(), []);
  protected readonly plan = computed<MembershipPlan | null>(
    () => this.loader.data().find((p) => p.slug === this.slug()) ?? null,
  );

  protected featuresOf(plan: MembershipPlan): string[] {
    const fallback = PLAN_FEATURES[plan.slug];
    if (fallback) {
      return this.i18n.lang() === 'ar' ? fallback.featuresAr : fallback.featuresEn;
    }
    const desc = this.i18n.pick(plan, 'descriptionAr', 'descriptionEn');
    return desc ? [desc] : [];
  }

  protected durationLabel(plan: MembershipPlan): string {
    const unit = plan.durationUnit === 'year'
      ? this.i18n.t('membershipsPage.durationYear')
      : plan.duration > 1 ? this.i18n.t('membershipsPage.durationMonths') : this.i18n.t('membershipsPage.durationMonth');
    return `${plan.duration} ${unit}`;
  }

  protected subscribe(plan: MembershipPlan): void {
    if (!this.store.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: `/memberships/${plan.slug}` } }).catch(() => undefined);
      return;
    }
    this.subscribing.set(true);
    this.paymentPending.set(false);
    this.payments.checkout(plan.id).subscribe({
      next: (checkout) => {
        if (checkout.provider !== 'moyasar') {
          this.createSubscription(plan);
          return;
        }
        this.payments.savePending({ planId: plan.id, planSlug: plan.slug, idempotencyKey: checkout.idempotencyKey });
        this.subscribing.set(false);
        this.testMode.set(checkout.publishableKey?.startsWith('pk_test_') ?? false);
        this.showPaymentForm.set(true);
        afterNextRender(() => {
          this.payments.mountMoyasarForm('#moyasar-form', checkout, this.i18n.lang() === 'ar' ? 'ar' : 'en').catch(() => {
            this.showPaymentForm.set(false);
            this.toast.error(this.i18n.t('common.error'));
          });
        }, { injector: this.injector });
      },
      error: (err: unknown) => this.handleError(err),
    });
  }

  /** Providers without a browser form (dev mock) charge directly. */
  private createSubscription(plan: MembershipPlan): void {
    this.membershipService.subscribe(plan.id, undefined, undefined, newIdempotencyKey()).subscribe({
      next: () => {
        this.subscribing.set(false);
        this.toast.success(this.i18n.t('common.saved'), this.i18n.pick(plan));
        this.router.navigate(['/account/membership']).catch(() => undefined);
      },
      error: (err: unknown) => this.handleError(err),
    });
  }

  private handleError(err: unknown): void {
    this.subscribing.set(false);
    const apiError = normalizeHttpError(err);
    if (apiError.status === 402 && apiError.code === PAYMENT_CREDENTIALS_REQUIRED) {
      this.paymentPending.set(true);
    } else {
      this.toast.error(apiError.message || this.i18n.t('common.error'));
    }
  }
}
