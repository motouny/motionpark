import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { createLoader } from '../../../core/loader';
import { I18nService } from '../../../i18n/i18n.service';
import { DashboardStats, HealthStatus, OdooStatus } from '../../../models';
import { AdminService } from '../../../services/admin.service';
import { OdooIntegrationService } from '../../../integrations/odoo-integration.service';
import { IconComponent } from '../../../shared/icon.component';
import { LoadingComponent } from '../../../shared/loading.component';
import { ErrorStateComponent } from '../../../shared/error-state.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, IconComponent, LoadingComponent, ErrorStateComponent],
  template: `
    <div class="admin-page-head">
      <div>
        <h1>{{ i18n.t('admin.dashboard') }}</h1>
      </div>
    </div>

    @if (statsLoader.loading()) {
      <app-loading [label]="i18n.t('common.loading')" />
    } @else if (statsLoader.error()) {
      <app-error-state [message]="i18n.t('common.error')" (retry)="statsLoader.reload()" />
    } @else {
      <div class="stat-grid">
        <div class="stat-card">
          <app-icon name="user" size="1.3rem" />
          <strong>{{ stats().totalCustomers ?? 0 }}</strong>
          <span>{{ i18n.t('admin.totalCustomers') }}</span>
        </div>
        <div class="stat-card">
          <app-icon name="check" size="1.3rem" />
          <strong>{{ stats().totalBookings ?? 0 }}</strong>
          <span>{{ i18n.t('admin.totalBookings') }}</span>
        </div>
        <div class="stat-card">
          <app-icon name="bell" size="1.3rem" />
          <strong>{{ stats().totalLeads ?? 0 }}</strong>
          <span>{{ i18n.t('admin.totalLeads') }}</span>
        </div>
        <div class="stat-card">
          <app-icon name="card" size="1.3rem" />
          <strong>{{ stats().activeMemberships ?? 0 }}</strong>
          <span>{{ i18n.t('admin.activeMemberships') }}</span>
        </div>
      </div>

      <div class="cards-row">
        <div class="admin-card">
          <h3>{{ i18n.t('admin.odooStatus') }}</h3>
          @if (odooLoader.loading()) {
            <app-loading />
          } @else {
            <p class="conn" [class.ok]="odoo().connected">
              <span class="conn-dot"></span>
              {{ odoo().connected ? i18n.t('admin.connected') : i18n.t('admin.notConnected') }}
            </p>
            <dl class="facts">
              <div><dt>{{ i18n.t('admin.failedJobs') }}</dt><dd>{{ odoo().failedJobs }}</dd></div>
              <div><dt>{{ i18n.t('admin.pendingQueue') }}</dt><dd>{{ odoo().pendingQueue }}</dd></div>
              @if (odoo().lastSuccessAt) {
                <div><dt>{{ i18n.t('admin.lastSync') }}</dt><dd>{{ odoo().lastSuccessAt | date: 'medium' }}</dd></div>
              }
            </dl>
            <a routerLink="/admin/integrations/odoo" class="btn btn-ghost btn-sm">{{ i18n.t('admin.odoo') }}</a>
          }
        </div>

        <div class="admin-card">
          <h3>{{ i18n.t('admin.health') }}</h3>
          @if (healthLoader.loading()) {
            <app-loading />
          } @else {
            <p class="conn" [class.ok]="healthOk()" [class.warn]="!healthOk()">
              <span class="conn-dot"></span>
              {{ health().status ?? '—' }}
            </p>
            @if (health().lastSyncAt) {
              <dl class="facts">
                <div><dt>{{ i18n.t('admin.lastSync') }}</dt><dd>{{ health().lastSyncAt | date: 'medium' }}</dd></div>
                <div><dt>{{ i18n.t('admin.failedJobs') }}</dt><dd>{{ health().failedJobs ?? 0 }}</dd></div>
              </dl>
            }
          }
        </div>
      </div>
    }
  `,
  styles: `
    .cards-row { display: grid; gap: 1rem; margin-top: 1rem; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
    .conn { display: flex; align-items: center; gap: .5rem; font-weight: 800; margin-bottom: 1rem; }
    .conn-dot { width: .65rem; height: .65rem; border-radius: 50%; background: #ef4444; }
    .conn.ok .conn-dot { background: #22c55e; }
    .conn.warn .conn-dot { background: #f59e0b; }
    .facts { display: grid; gap: .6rem; margin-bottom: 1.25rem; }
    .facts div { display: flex; justify-content: space-between; font-size: .88rem; }
    .facts dt { color: var(--muted-foreground); }
    .facts dd { margin: 0; font-weight: 700; }
  `,
})
export class AdminDashboardComponent {
  protected readonly i18n = inject(I18nService);
  private readonly admin = inject(AdminService);
  private readonly odooIntegration = inject(OdooIntegrationService);

  protected readonly statsLoader = createLoader<DashboardStats>(
    () => this.admin.dashboard().pipe(catchError(() => of({}))),
    {},
  );
  protected readonly stats = computed(() => this.statsLoader.data());

  protected readonly odooLoader = createLoader<OdooStatus>(
    () => this.odooIntegration.status().pipe(catchError(() => of({ connected: false, failedJobs: 0, pendingQueue: 0 }))),
    { connected: false, failedJobs: 0, pendingQueue: 0 },
  );
  protected readonly odoo = computed(() => this.odooLoader.data());

  protected readonly healthLoader = createLoader<HealthStatus>(
    () => this.admin.health().pipe(catchError(() => of({}))),
    {},
  );
  protected readonly health = computed(() => this.healthLoader.data());
  protected readonly healthOk = computed(() => (this.health().status ?? '').toLowerCase() === 'healthy');
}
