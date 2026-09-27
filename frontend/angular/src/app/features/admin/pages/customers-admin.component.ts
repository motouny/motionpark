import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { catchError, of } from 'rxjs';
import { createLoader } from '../../../core/loader';
import { I18nService } from '../../../i18n/i18n.service';
import { AdminCustomer } from '../../../models';
import { AdminService } from '../../../services/admin.service';
import { EmptyComponent } from '../../../shared/empty.component';
import { ErrorStateComponent } from '../../../shared/error-state.component';
import { LoadingComponent } from '../../../shared/loading.component';
import { ToastService } from '../../../shared/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingComponent, EmptyComponent, ErrorStateComponent],
  template: `
    <div class="admin-page-head"><div><h1>{{ i18n.t('admin.customers') }}</h1></div></div>
    @if (loader.loading()) {
      <app-loading [label]="i18n.t('common.loading')" />
    } @else if (loader.error()) {
      <app-error-state [message]="i18n.t('common.error')" (retry)="loader.reload()" />
    } @else if (items().length === 0) {
      <app-empty [message]="i18n.t('common.noResults')" />
    } @else {
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>{{ i18n.t('common.name') }}</th><th>{{ i18n.t('common.phone') }}</th><th>{{ i18n.t('common.email') }}</th><th>{{ i18n.t('common.status') }}</th></tr></thead>
          <tbody>
            @for (c of items(); track c.id) {
              <tr>
                <td>{{ c.name }}</td>
                <td>{{ c.phone ?? '-' }}</td>
                <td>{{ c.email ?? '-' }}</td>
                <td><span class="chip" [class]="'chip chip-' + (c.isActive ? 'success' : 'muted')">{{ c.isActive ? i18n.t('common.active') : i18n.t('common.inactive') }}</span></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class CustomersAdminComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly admin = inject(AdminService);
  protected readonly toast = inject(ToastService);

  protected readonly loader = createLoader<AdminCustomer[]>(
    () => this.admin.customers().pipe(catchError(() => of([] as AdminCustomer[]))),
    [],
  );
  protected readonly items = computed(() => this.loader.data());
}
