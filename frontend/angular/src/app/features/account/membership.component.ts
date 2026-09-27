import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { createLoader } from '../../core/loader';
import { I18nService } from '../../i18n/i18n.service';
import { AccountMembership, Subscription } from '../../models';
import { AccountService } from '../../services/account.service';
import { QrDisplayComponent } from '../../shared/qr-display.component';
import { EmptyComponent } from '../../shared/empty.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { IconComponent } from '../../shared/icon.component';
import { LoadingComponent } from '../../shared/loading.component';
import { ToastService } from '../../shared/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, DatePipe, DecimalPipe, IconComponent, LoadingComponent,
    EmptyComponent, ErrorStateComponent, QrDisplayComponent,
  ],
  template: `
    <h2 class="page-title">{{ i18n.t('account.membership.title') }}</h2>

    @if (loader.loading()) {
      <app-loading [label]="i18n.t('common.loading')" />
    } @else if (loader.error()) {
      <app-error-state [message]="i18n.t('common.error')" (retry)="reload()" />
    } @else if (!hasMembership()) {
      <div class="card empty-card">
        <app-icon name="card" size="2.4rem" />
        <p>{{ i18n.t('account.membership.noMembership') }}</p>
        <a routerLink="/memberships" class="btn gradient-button">
          {{ i18n.t('account.membership.noMembershipCta') }}
        </a>
      </div>
    } @else {
      <div class="grid">
        <div class="card plan-card">
          <span class="chip chip-success status-chip">{{ statusLabel() }}</span>
          <p class="label">{{ i18n.t('account.membership.currentPlan') }}</p>
          <h3>{{ planName() }}</h3>
          @if (subscription(); as sub) {
            <div class="facts">
              @if (sub.endDate) {
                <div>
                  <span>{{ i18n.t('account.membership.validUntil', { date: '' }) }}</span>
                  <strong>{{ sub.endDate | date: 'mediumDate' }}</strong>
                </div>
              }
              @if (sub.nextBillingDate) {
                <div>
                  <span>{{ i18n.t('account.membership.nextBilling', { date: '' }) }}</span>
                  <strong>{{ sub.nextBillingDate | date: 'mediumDate' }}</strong>
                </div>
              }
              <div>
                <span>{{ i18n.t('account.membership.remainingSessions') }}</span>
                <strong>
                  @if (sub.remainingSessions == null || planSessionUnlimited()) {
                    {{ i18n.t('account.membership.unlimited') }}
                  } @else {
                    {{ sub.remainingSessions }}
                  }
                </strong>
              </div>
              <div>
                <span>{{ i18n.t('account.membership.autoRenew') }}</span>
                <strong>{{ sub.autoRenew ? i18n.t('common.yes') : i18n.t('common.no') }}</strong>
              </div>
            </div>
            <div class="actions">
              <button class="btn btn-ghost btn-sm" (click)="renew()" [disabled]="actioning()">
                {{ i18n.t('account.membership.renewSubscription') }}
              </button>
              <button class="btn btn-danger btn-sm" (click)="cancel()" [disabled]="actioning()">
                {{ i18n.t('account.membership.cancelSubscription') }}
              </button>
            </div>
          }
        </div>

        <div class="card qr-card">
          <h3>{{ i18n.t('account.membership.qrTitle') }}</h3>
          <app-qr-display [refreshTrigger]="qrTick()" />
          <p class="hint">{{ i18n.t('account.membership.qrHint') }}</p>
        </div>
      </div>
    }
  `,
  styles: `
    .page-title { font-size: 1.3rem; font-weight: 900; margin-bottom: 1.5rem; }
    .grid { display: grid; gap: 1.5rem; @media (min-width: 900px) { grid-template-columns: 1.2fr .8fr; align-items: start; } }
    .plan-card, .qr-card, .empty-card { padding: 2rem; }
    .status-chip { margin-bottom: 1.25rem; }
    .label { color: var(--muted-foreground); font-size: .85rem; font-weight: 700; }
    .plan-card h3 { margin-top: .35rem; font-size: 1.8rem; font-weight: 900; }
    .facts { margin-top: 1.75rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1.1rem; }
    .facts span { display: block; font-size: .78rem; color: var(--muted-foreground); }
    .facts strong { display: block; margin-top: .2rem; font-size: 1rem; }
    .actions { margin-top: 1.75rem; display: flex; gap: .75rem; flex-wrap: wrap; }
    .qr-card { display: grid; justify-items: center; text-align: center; }
    .qr-card h3 { font-size: 1.1rem; font-weight: 900; margin-bottom: 1.25rem; }
    .hint { margin-top: 1.25rem; font-size: .82rem; color: var(--muted-foreground); line-height: 1.7; }
    .empty-card { display: grid; justify-items: center; gap: 1rem; color: var(--muted-foreground); padding: 3.5rem 2rem; }
  `,
})
export class MembershipComponent {
  protected readonly i18n = inject(I18nService);
  private readonly account = inject(AccountService);
  private readonly toast = inject(ToastService);

  protected readonly actioning = signal(false);
  protected readonly qrTick = signal(0);

  protected readonly loader = createLoader<AccountMembership>(() => this.account.membership(), {
    membership: null,
    plan: null,
  });

  protected readonly subscriptionLoader = createLoader<Subscription | null>(
    () => this.account.subscription().pipe(catchError(() => of(null))),
    null,
  );

  protected readonly hasMembership = computed(() => {
    const m = this.loader.data();
    return !!m?.membership || !!m?.plan;
  });

  protected readonly planName = computed(() => {
    const m = this.loader.data();
    return this.i18n.pick(m?.plan ?? null) || this.i18n.pick(this.subscriptionLoader.data()?.plan ?? null);
  });

  protected readonly subscription = computed(() => {
    const direct = this.subscriptionLoader.data();
    const m = this.loader.data();
    if (direct) return direct;
    if (m?.membership) {
      return {
        id: m.membership.id,
        plan: m.plan,
        status: m.membership.status,
        endDate: m.membership.endDate,
        remainingSessions: m.membership.remainingSessions ?? null,
        autoRenew: m.membership.autoRenew,
      } as Subscription;
    }
    return null;
  });

  protected readonly planSessionUnlimited = computed(() => {
    const plan = this.loader.data()?.plan;
    return !!plan && plan.sessionLimit === 0;
  });

  protected readonly statusLabel = computed(() => {
    const status = this.subscription()?.status ?? this.loader.data()?.membership?.status ?? '';
    return this.i18n.t(`account.status.${status}`) === `account.status.${status}`
      ? status
      : this.i18n.t(`account.status.${status}`);
  });

  protected reload(): void {
    this.loader.reload();
    this.subscriptionLoader.reload();
    this.qrTick.update((v) => v + 1);
  }

  protected renew(): void {
    const sub = this.subscription();
    if (!sub) return;
    this.actioning.set(true);
    this.account.renewSubscription(sub.id).subscribe({
      next: () => {
        this.actioning.set(false);
        this.toast.success(this.i18n.t('common.saved'));
        this.reload();
      },
      error: () => this.actioning.set(false),
    });
  }

  protected cancel(): void {
    const sub = this.subscription();
    if (!sub) return;
    if (!window.confirm(this.i18n.t('common.deleteConfirmBody'))) return;
    this.actioning.set(true);
    this.account.cancelSubscription(sub.id).subscribe({
      next: () => {
        this.actioning.set(false);
        this.toast.success(this.i18n.t('common.saved'));
        this.reload();
      },
      error: () => this.actioning.set(false),
    });
  }
}
