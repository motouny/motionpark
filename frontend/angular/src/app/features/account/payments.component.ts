import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { catchError, of } from 'rxjs';
import { createLoader } from '../../core/loader';
import { I18nService } from '../../i18n/i18n.service';
import { Payment } from '../../models';
import { AccountService } from '../../services/account.service';
import { EmptyComponent } from '../../shared/empty.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { IconComponent } from '../../shared/icon.component';
import { LoadingComponent } from '../../shared/loading.component';
import { SarPipe } from '../../shared/sar.pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IconComponent, LoadingComponent, EmptyComponent, ErrorStateComponent, SarPipe],
  template: `
    <h2 class="page-title">{{ i18n.t('account.payments.title') }}</h2>

    @if (loader.loading()) {
      <app-loading [label]="i18n.t('common.loading')" />
    } @else if (loader.error()) {
      <app-error-state [message]="i18n.t('common.error')" (retry)="loader.reload()" />
    } @else if (payments().length === 0) {
      <div class="card empty-card">
        <app-icon name="card" size="2.4rem" />
        <p>{{ i18n.t('account.payments.empty') }}</p>
      </div>
    } @else {
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>{{ i18n.t('common.date') }}</th>
              <th>{{ i18n.t('account.payments.method') }}</th>
              <th>{{ i18n.t('common.status') }}</th>
              <th>{{ i18n.t('account.payments.amount') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (p of payments(); track p.id) {
              <tr>
                <td>{{ p.createdAt | date: 'mediumDate' }}</td>
                <td>{{ p.method ?? '—' }}</td>
                <td><span class="chip" [class]="'chip chip-' + kind(p.status)">{{ p.status ?? '—' }}</span></td>
                <td>{{ p.amount | sar: lang() }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: `
    .page-title { font-size: 1.3rem; font-weight: 900; margin-bottom: 1.5rem; }
    .empty-card { display: grid; justify-items: center; gap: 1rem; color: var(--muted-foreground); padding: 3.5rem 2rem; }
    .chip-success { background: rgba(34,197,94,.16); color: #4ade80; }
    .chip-warning { background: rgba(251,146,60,.16); color: #fdba74; }
    .chip-muted { background: rgba(245,245,247,.08); color: rgba(245,245,247,.75); }
  `,
})
export class PaymentsComponent {
  protected readonly i18n = inject(I18nService);
  private readonly account = inject(AccountService);

  protected readonly lang = this.i18n.lang;

  protected readonly loader = createLoader<Payment[]>(
    () => this.account.payments().pipe(catchError(() => of([] as Payment[]))),
    [],
  );
  protected readonly payments = computed(() =>
    [...this.loader.data()].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
  );

  protected kind(status?: string): string {
    switch (status) {
      case 'paid': case 'success': case 'completed': return 'success';
      case 'pending': case 'pending_payment': return 'warning';
      default: return 'muted';
    }
  }
}
