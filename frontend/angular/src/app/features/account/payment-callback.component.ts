import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { normalizeHttpError } from '../../core/errors';
import { I18nService } from '../../i18n/i18n.service';
import { MembershipService } from '../../services/membership.service';
import { PaymentService } from '../../services/payment.service';
import { IconComponent } from '../../shared/icon.component';
import { LoadingComponent } from '../../shared/loading.component';

type CallbackState = 'confirming' | 'failed' | 'confirmFailed' | 'processing';

/**
 * Moyasar redirects here after the payment form (3-D Secure for mada, Apple Pay):
 * `?id=<payment id>&status=paid|failed&message=…`. A paid payment is sent to the API,
 * which verifies it with Moyasar before activating the membership.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, LoadingComponent],
  template: `
    <h2 class="page-title">{{ i18n.t('paymentCallback.title') }}</h2>
    <div class="card state-card">
      @switch (state()) {
        @case ('confirming') {
          <app-loading [label]="i18n.t('paymentCallback.confirming')" />
        }
        @case ('processing') {
          <app-icon name="check" size="2rem" />
          <p>{{ i18n.t('paymentCallback.processing') }}</p>
          <a class="btn gradient-button" routerLink="/account/membership">{{ i18n.t('paymentCallback.toMembership') }}</a>
        }
        @case ('failed') {
          <app-icon name="alert" size="2rem" />
          <p>{{ i18n.t('paymentCallback.failed') }}</p>
          @if (message()) {
            <p class="muted">{{ message() }}</p>
          }
          <a class="btn gradient-button" [routerLink]="retryLink()">{{ i18n.t('paymentCallback.retry') }}</a>
        }
        @case ('confirmFailed') {
          <app-icon name="alert" size="2rem" />
          <p>{{ i18n.t('paymentCallback.confirmFailed') }}</p>
          @if (message()) {
            <p class="muted">{{ message() }}</p>
          }
          <a class="btn gradient-button" routerLink="/contact">{{ i18n.t('nav.contact') }}</a>
        }
      }
    </div>
  `,
  styles: `
    .state-card { display: grid; justify-items: center; gap: 1rem; padding: 2.5rem 1.5rem; text-align: center; }
    .muted { color: var(--muted-foreground); font-size: .85rem; }
  `,
})
export class PaymentCallbackComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly payments = inject(PaymentService);
  private readonly memberships = inject(MembershipService);

  protected readonly state = signal<CallbackState>('confirming');
  protected readonly message = signal<string | null>(null);
  protected readonly retryLink = signal<string>('/memberships');

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const paymentId = params.get('id');
    const status = params.get('status');
    const pending = this.payments.takePending();
    if (pending) this.retryLink.set(`/memberships/${pending.planSlug}`);

    if (!paymentId || status !== 'paid') {
      this.message.set(params.get('message'));
      this.state.set('failed');
      return;
    }
    if (!pending) {
      // Opened in another tab or storage was cleared: the payment webhook completes the subscription.
      this.state.set('processing');
      return;
    }

    this.memberships.subscribe(pending.planId, undefined, paymentId, pending.idempotencyKey).subscribe({
      next: () => this.router.navigate(['/account/membership']).catch(() => undefined),
      error: (err: unknown) => {
        const apiError = normalizeHttpError(err);
        if (apiError.code === 'PAYMENT_ALREADY_USED') {
          this.state.set('processing'); // the webhook got there first
          return;
        }
        this.message.set(apiError.message || null);
        this.state.set('confirmFailed');
      },
    });
  }
}
