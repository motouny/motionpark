import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { catchError, of } from 'rxjs';
import { createLoader } from '../../core/loader';
import { I18nService } from '../../i18n/i18n.service';
import { Invoice } from '../../models';
import { AccountService } from '../../services/account.service';
import { EmptyComponent } from '../../shared/empty.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { IconComponent } from '../../shared/icon.component';
import { LoadingComponent } from '../../shared/loading.component';
import { SarPipe } from '../../shared/sar.pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, DecimalPipe, IconComponent, LoadingComponent, EmptyComponent, ErrorStateComponent, SarPipe,
  ],
  template: `
    <h2 class="page-title">{{ i18n.t('account.invoices.title') }}</h2>

    @if (loader.loading()) {
      <app-loading [label]="i18n.t('common.loading')" />
    } @else if (loader.error()) {
      <app-error-state [message]="i18n.t('common.error')" (retry)="loader.reload()" />
    } @else if (invoices().length === 0) {
      <div class="card empty-card">
        <app-icon name="file" size="2.4rem" />
        <p>{{ i18n.t('account.invoices.empty') }}</p>
      </div>
    } @else {
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>{{ i18n.t('account.invoices.number') }}</th>
              <th>{{ i18n.t('common.date') }}</th>
              <th>{{ i18n.t('account.invoices.subtotal') }}</th>
              <th>{{ i18n.t('account.invoices.vat') }}</th>
              <th>{{ i18n.t('account.invoices.total') }}</th>
              <th>{{ i18n.t('common.status') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (inv of invoices(); track inv.id) {
              <tr>
                <td>{{ inv.number ?? inv.id.slice(0, 8) }}</td>
                <td>{{ inv.date | date: 'mediumDate' }}</td>
                <td>{{ (inv.amount ?? 0) | number: '1.2-2' }} {{ i18n.t('common.currency') }}</td>
                <td>{{ (inv.vat ?? 0) | number: '1.2-2' }} {{ i18n.t('common.currency') }}</td>
                <td><strong>{{ (inv.total ?? 0) | number: '1.2-2' }} {{ i18n.t('common.currency') }}</strong></td>
                <td><span class="chip" [class]="'chip chip-' + kind(inv.status)">{{ inv.status ?? '—' }}</span></td>
                <td>
                  @if (inv.pdfUrl) {
                    <a class="icon-btn" [href]="inv.pdfUrl" target="_blank" rel="noopener" [attr.aria-label]="i18n.t('account.invoices.download')">
                      <app-icon name="download" size="0.95rem" />
                    </a>
                  }
                </td>
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
export class InvoicesComponent {
  protected readonly i18n = inject(I18nService);
  private readonly account = inject(AccountService);

  protected readonly loader = createLoader<Invoice[]>(
    () => this.account.invoices().pipe(catchError(() => of([] as Invoice[]))),
    [],
  );
  protected readonly invoices = computed(() =>
    [...this.loader.data()].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
  );

  protected kind(status?: string): string {
    switch (status) {
      case 'paid': case 'posted': return 'success';
      case 'pending': case 'pending_payment': return 'warning';
      default: return 'muted';
    }
  }
}
