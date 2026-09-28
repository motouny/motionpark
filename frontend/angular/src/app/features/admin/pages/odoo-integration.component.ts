import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { createLoader } from '../../../core/loader';
import { I18nService } from '../../../i18n/i18n.service';
import { OdooLogEntry, OdooStatus } from '../../../models';
import { OdooIntegrationService } from '../../../integrations/odoo-integration.service';
import { EmptyComponent } from '../../../shared/empty.component';
import { ErrorStateComponent } from '../../../shared/error-state.component';
import { IconComponent } from '../../../shared/icon.component';
import { LoadingComponent } from '../../../shared/loading.component';
import { ToastService } from '../../../shared/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IconComponent, LoadingComponent, EmptyComponent, ErrorStateComponent],
  template: `
    <div class="admin-page-head">
      <div>
        <h1>{{ i18n.t('admin.odoo') }}</h1>
        <p>{{ i18n.t('admin.odooStatus') }}</p>
      </div>
    </div>

    @if (statusLoader.loading()) {
      <app-loading [label]="i18n.t('common.loading')" />
    } @else if (statusLoader.error()) {
      <app-error-state [message]="i18n.t('common.error')" (retry)="statusLoader.reload()" />
    } @else {
      <div class="status-card" [class.ok]="status().connected">
        <div class="status-head">
          <span class="conn-dot"></span>
          <strong>{{ status().connected ? i18n.t('admin.connected') : i18n.t('admin.notConnected') }}</strong>
        </div>
        <dl class="facts">
          <div><dt>{{ i18n.t('admin.lastSync') }}</dt><dd>{{ status().lastSuccessAt ? (status().lastSuccessAt | date: 'medium') : '—' }}</dd></div>
          <div><dt>{{ i18n.t('admin.lastPlanSync') }}</dt><dd>{{ status().lastPlanSyncAt ? (status().lastPlanSyncAt | date: 'medium') : '—' }}</dd></div>
          <div><dt>{{ i18n.t('admin.lastCustomerSync') }}</dt><dd>{{ status().lastCustomerSyncAt ? (status().lastCustomerSyncAt | date: 'medium') : '—' }}</dd></div>
          <div><dt>{{ i18n.t('admin.failedJobs') }}</dt><dd>{{ status().failedJobs }}</dd></div>
          <div><dt>{{ i18n.t('admin.pendingQueue') }}</dt><dd>{{ status().pendingQueue }}</dd></div>
        </dl>
        <div class="actions">
          <button class="btn btn-ghost btn-sm" (click)="test()" [disabled]="busy()">
            @if (busy() === 'test') { {{ i18n.t('admin.testing') }} } @else {
              <app-icon name="external" size="0.9rem" /> {{ i18n.t('admin.testConnection') }}
            }
          </button>
          <button class="btn gradient-button btn-sm" (click)="syncPlans()" [disabled]="busy()">
            @if (busy() === 'sync') { {{ i18n.t('admin.syncing') }} } @else {
              <app-icon name="refresh" size="0.9rem" /> {{ i18n.t('admin.syncPlans') }}
            }
          </button>
          <button class="btn btn-ghost btn-sm" (click)="retryFailed()" [disabled]="busy()">
            <app-icon name="history" size="0.9rem" /> {{ i18n.t('admin.retryFailed') }}
          </button>
          <button class="btn btn-ghost btn-sm" (click)="showLogs.set(!showLogs())">
            <app-icon name="list" size="0.9rem" /> {{ i18n.t('admin.logs') }}
          </button>
        </div>
      </div>
    }

    @if (showLogs()) {
      <div class="admin-card" style="margin-top: 1.5rem;">
        <h3>{{ i18n.t('admin.logs') }}</h3>
        @if (logsLoader.loading()) {
          <app-loading />
        } @else if (logs().length === 0) {
          <app-empty [message]="i18n.t('common.noResults')" />
        } @else {
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>{{ i18n.t('common.date') }}</th>
                  <th>{{ i18n.t('common.status') }}</th>
                  <th>Job</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                @for (log of logs(); track log.id ?? log.createdAt) {
                  <tr>
                    <td>{{ log.createdAt | date: 'medium' }}</td>
                    <td><span class="chip" [class]="'chip chip-' + kind(log.status)">{{ log.status ?? '—' }}</span></td>
                    <td>{{ log.jobType ?? '—' }}</td>
                    <td>{{ log.message ?? '' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    }
  `,
  styles: `
    .status-card {
      border: 1px solid var(--border); border-radius: 20px;
      background: var(--card); padding: 1.75rem;
      &.ok { border-color: rgba(34,197,94,.35); }
    }
    .status-head { display: flex; align-items: center; gap: .6rem; font-size: 1.1rem; margin-bottom: 1.25rem; }
    .conn-dot { width: .8rem; height: .8rem; border-radius: 50%; background: #ef4444; }
    .ok .conn-dot { background: #22c55e; }
    .facts { display: grid; gap: .7rem; margin-bottom: 1.5rem; }
    .facts div { display: flex; justify-content: space-between; font-size: .9rem; }
    .facts dt { color: var(--muted-foreground); }
    .facts dd { margin: 0; font-weight: 700; }
    .actions { display: flex; gap: .6rem; flex-wrap: wrap; }
    .chip-success { background: rgba(34,197,94,.16); color: #4ade80; }
    .chip-danger { background: rgba(239,68,68,.16); color: #fca5a5; }
    .chip-warning { background: rgba(251,146,60,.16); color: #fdba74; }
    .chip-muted { background: rgba(245,245,247,.08); color: rgba(245,245,247,.75); }
  `,
})
export class OdooIntegrationComponent {
  protected readonly i18n = inject(I18nService);
  private readonly odoo = inject(OdooIntegrationService);
  private readonly toast = inject(ToastService);

  protected readonly busy = signal<'' | 'test' | 'sync' | 'retry'>('');
  protected readonly showLogs = signal(false);

  protected readonly statusLoader = createLoader<OdooStatus>(
    () => this.odoo.status().pipe(catchError(() => of({ connected: false, failedJobs: 0, pendingQueue: 0 }))),
    { connected: false, failedJobs: 0, pendingQueue: 0 },
  );
  protected readonly status = computed(() => this.statusLoader.data());

  protected readonly logsLoader = createLoader<OdooLogEntry[]>(
    () => this.odoo.logs().pipe(catchError(() => of([] as OdooLogEntry[]))),
    [],
  );
  protected readonly logs = computed(() => this.logsLoader.data());

  protected test(): void {
    this.busy.set('test');
    this.odoo.testConnection().subscribe({
      next: (res) => {
        this.busy.set('');
        this.toast.success(res.success ? this.i18n.t('admin.connected') : this.i18n.t('admin.notConnected'), res.message);
        this.statusLoader.reload();
      },
      error: () => {
        this.busy.set('');
        this.toast.error(this.i18n.t('common.error'));
      },
    });
  }

  protected syncPlans(): void {
    this.busy.set('sync');
    this.odoo.syncPlans().subscribe({
      next: (res) => {
        this.busy.set('');
        this.toast.success(this.i18n.t('common.saved'), res.message ?? (res.synced != null ? `Synced: ${res.synced}` : undefined));
        this.statusLoader.reload();
      },
      error: () => {
        this.busy.set('');
        this.toast.error(this.i18n.t('common.error'));
      },
    });
  }

  protected retryFailed(): void {
    this.busy.set('retry');
    this.odoo.retryFailed().subscribe({
      next: () => {
        this.busy.set('');
        this.toast.success(this.i18n.t('common.saved'));
        this.statusLoader.reload();
      },
      error: () => {
        this.busy.set('');
        this.toast.error(this.i18n.t('common.error'));
      },
    });
  }

  protected kind(status?: string): string {
    switch (status) {
      case 'success': case 'completed': return 'success';
      case 'failed': case 'error': return 'danger';
      case 'pending': case 'retrying': return 'warning';
      default: return 'muted';
    }
  }
}
