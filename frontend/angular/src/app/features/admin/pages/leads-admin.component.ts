import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { catchError, of } from 'rxjs';
import { createLoader } from '../../../core/loader';
import { I18nService } from '../../../i18n/i18n.service';
import { Lead } from '../../../models';
import { AdminService } from '../../../services/admin.service';
import { EmptyComponent } from '../../../shared/empty.component';
import { ErrorStateComponent } from '../../../shared/error-state.component';
import { LoadingComponent } from '../../../shared/loading.component';
import { ToastService } from '../../../shared/toast.service';

const STATUSES = ['New', 'Contacted', 'Qualified', 'Converted', 'Lost'];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingComponent, EmptyComponent, ErrorStateComponent],
  template: `
    <div class="admin-page-head"><div><h1>{{ i18n.t('admin.leads') }}</h1></div></div>
    @if (loader.loading()) {
      <app-loading [label]="i18n.t('common.loading')" />
    } @else if (loader.error()) {
      <app-error-state [message]="i18n.t('common.error')" (retry)="loader.reload()" />
    } @else if (items().length === 0) {
      <app-empty [message]="i18n.t('common.noResults')" />
    } @else {
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>{{ i18n.t('common.name') }}</th><th>{{ i18n.t('common.phone') }}</th><th>Type</th><th>{{ i18n.t('common.status') }}</th></tr></thead>
          <tbody>
            @for (l of items(); track l.id) {
              <tr>
                <td>{{ l.name }}<br /><small style="color: var(--muted-foreground)">{{ l.email ?? '' }}</small></td>
                <td>{{ l.phone }}</td>
                <td>{{ l.type ?? '-' }}</td>
                <td>
                  <select class="form-select" [value]="l.status ?? 'New'" (change)="setStatus(l, $event)">
                    @for (s of statuses; track s) { <option [value]="s" [selected]="s === (l.status ?? 'New')">{{ s }}</option> }
                  </select>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class LeadsAdminComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly admin = inject(AdminService);
  protected readonly toast = inject(ToastService);
  protected readonly statuses = STATUSES;

  protected readonly loader = createLoader<Lead[]>(
    () => this.admin.leads().pipe(catchError(() => of([] as Lead[]))),
    [],
  );
  protected readonly items = computed(() => this.loader.data());

  protected setStatus(l: Lead, ev: Event): void {
    const status = (ev.target as HTMLSelectElement).value;
    this.admin.updateLead(l.id, { status }).subscribe({
      next: () => { this.toast.success(this.i18n.t('common.saved')); this.loader.reload(); },
      error: () => this.toast.error(this.i18n.t('common.error')),
    });
  }
}
